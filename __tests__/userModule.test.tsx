/**
 * User module: the paged list hook (users, overseers, switch user, role change
 * requests) and the user service.
 */
import React from 'react';
import renderer, {act} from 'react-test-renderer';

jest.mock('../app/config/api', () => ({
  __esModule: true,
  DEFAULT_PAGE_LIMIT: 10,
  default: {get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn()},
}));

import api from '../app/config/api';
import {
  looksInconsistent,
  resolveTotalPages,
  usePagedList,
  type PagedListPage,
} from '../app/modules/user/hooks/usePagedList';
import {listUsers, uploadUserPhoto} from '../app/modules/user/services/user.service';

type Item = {id: number};
type Fetch = (page: number, search: string) => Promise<PagedListPage<Item> | undefined>;

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}

const pageOf = (ids: number[], extra: Partial<PagedListPage<Item>> = {}): PagedListPage<Item> => ({
  items: ids.map(id => ({id})),
  total: ids.length,
  page: 1,
  total_pages: 1,
  has_next: false,
  ...extra,
});

function mount(fetchPage: Fetch, query = '', enabled = true) {
  let latest: ReturnType<typeof usePagedList<Item>> | null = null;
  const Probe = (props: {query: string; enabled: boolean}) => {
    latest = usePagedList<Item>(fetchPage, props.query, props.enabled);
    return null;
  };
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(<Probe query={query} enabled={enabled} />);
  });
  return {
    get: () => latest!,
    setQuery: (q: string, e = true) =>
      act(() => {
        root.update(<Probe query={q} enabled={e} />);
      }),
  };
}

describe('usePagedList', () => {
  it('a slow answer for an older query does not replace the newer results', async () => {
    const calls: Record<string, ReturnType<typeof deferred<PagedListPage<Item>>>> = {};
    const fetchPage: Fetch = (_page, search) => {
      calls[search] = deferred<PagedListPage<Item>>();
      return calls[search].promise;
    };
    const list = mount(fetchPage, 'jo');
    // The new query starts while "jo" is still loading (it used to be dropped).
    list.setQuery('john');
    expect(Object.keys(calls).sort()).toEqual(['jo', 'john']);

    await act(async () => calls.john.resolve(pageOf([2])));
    await act(async () => calls.jo.resolve(pageOf([1])));
    expect(list.get().items).toEqual([{id: 2}]);
    expect(list.get().loading).toBe(false);
  });

  it('searches with the trimmed query and does not refetch for spaces', async () => {
    const fetchPage = jest.fn<ReturnType<Fetch>, Parameters<Fetch>>(async () => pageOf([1]));
    const list = mount(fetchPage, 'john');
    list.setQuery('john ');
    await act(async () => {});
    expect(fetchPage.mock.calls).toEqual([[1, 'john']]);
  });

  it('shows the last page when the requested one no longer exists', async () => {
    let totalPages = 3;
    const fetchPage = jest.fn<ReturnType<Fetch>, Parameters<Fetch>>(async page =>
      page > totalPages
        ? pageOf([], {page, total: 20, total_pages: totalPages})
        : pageOf([page * 10], {page, total: totalPages * 10, total_pages: totalPages}),
    );
    const list = mount(fetchPage);
    await act(async () => {});
    await act(async () => {
      list.get().goToPage(3);
    });
    expect(list.get().page).toBe(3);
    // Records were deleted elsewhere: page 3 is now past the end.
    totalPages = 2;
    await act(async () => {
      list.get().retry();
    });
    expect(fetchPage.mock.calls.slice(-2)).toEqual([[3, ''], [2, '']]);
    expect(list.get().page).toBe(2);
    expect(list.get().items).toEqual([{id: 20}]);
    expect(list.get().totalPages).toBe(2);
  });

  it('trusts has_next when total_pages says there is nothing after this page', () => {
    expect(resolveTotalPages({page: 1, total_pages: 1, has_next: true}, 1)).toBe(2);
    expect(resolveTotalPages({total_pages: 4, has_next: false}, 2)).toBe(4);
    expect(resolveTotalPages(undefined, 1)).toBe(1);
    expect(looksInconsistent({items: [{id: 1}, {id: 2}], total: 1}, 1)).toBe(true);
    expect(looksInconsistent({items: [{id: 1}], total: 1, total_pages: 1}, 1)).toBe(false);
  });

  it('Retry loads the page that failed, and a failure is an error, not "no users"', async () => {
    let fail = true;
    const fetchPage = jest.fn<ReturnType<Fetch>, Parameters<Fetch>>(async (page, search) => {
      if (search === 'x' && fail) {
        throw new Error('offline');
      }
      return pageOf([page], {page, total: 30, total_pages: 3});
    });
    const list = mount(fetchPage);
    await act(async () => {});
    await act(async () => {
      list.get().goToPage(3);
    });
    list.setQuery('x');
    await act(async () => {});
    expect((list.get().loadError as Error).message).toBe('offline');
    fail = false;
    await act(async () => {
      list.get().retry();
    });
    expect(fetchPage).toHaveBeenLastCalledWith(1, 'x');
    expect(list.get().loadError).toBeNull();
  });

  it('waits until enabled (e.g. the role is known)', async () => {
    const fetchPage = jest.fn<ReturnType<Fetch>, Parameters<Fetch>>(async () => pageOf([1]));
    const list = mount(fetchPage, '', false);
    await act(async () => {});
    expect(fetchPage).not.toHaveBeenCalled();
    list.setQuery('', true);
    await act(async () => {});
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

describe('user service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploadUserPhoto returns the stored path and fails without one', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({data: {data: {path: '/users/a.jpg'}}});
    await expect(uploadUserPhoto('/tmp/a.jpg', 'Ann')).resolves.toBe('/users/a.jpg');
    (api.post as jest.Mock).mockResolvedValueOnce({data: {path: '/users/a.jpg'}});
    await expect(uploadUserPhoto('/tmp/a.jpg')).rejects.toThrow();
  });

  it('listUsers sends a trimmed single-word search', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({data: {data: {items: []}}});
    await listUsers({search: ' john '});
    expect((api.get as jest.Mock).mock.calls[0][1].params.search).toBe('john');
  });

  it('listUsers matches every word of a multi-word search', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: {
          items: [
            {id: 1, name: 'Shane Clark'},
            {id: 2, name: 'Shane Smith'},
          ],
          has_next: false,
        },
      },
    });
    const res = await listUsers({search: 'shane cl'});
    expect(res.data.items.map(u => u.id)).toEqual([1]);
    expect((api.get as jest.Mock).mock.calls[0][1].params.search).toBe('shane');
  });
});
