export type SupportField = 'name' | 'email' | 'subject' | 'message';
export type SupportValues = Record<SupportField, string>;
export type SupportErrors = Partial<Record<SupportField, 'required'>>;

/**
 * Only "not empty" (the API also takes "   "). The e-mail is checked by the
 * server against the OMR records, so the app sends it as typed and shows the
 * server's answer.
 */
export function validateSupport(values: SupportValues): SupportErrors {
  const errors: SupportErrors = {};
  (['name', 'email', 'subject', 'message'] as SupportField[]).forEach(field => {
    if (!values[field].trim()) {
      errors[field] = 'required';
    }
  });
  return errors;
}

/** The server asks for a link to edit the profile e-mail (it did not match). */
export function shouldShowEditEmail(validation: Record<string, unknown> | null | undefined): boolean {
  const flag = validation?.showEditEmailButton;
  return flag === true || flag === 'true' || flag === 1 || flag === '1';
}

export function buildSupportPayload(values: SupportValues) {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    subject: values.subject.trim(),
    message: values.message.trim(),
  };
}

/** Name (to prefill) and id (for Edit Profile) of the signed-in user. */
export function contactFromProfile(user: any): {name: string; id: number | null} {
  const name =
    String(user?.name ?? '').trim() ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  const id = Number(user?.id);
  return {name, id: Number.isFinite(id) && id > 0 ? id : null};
}
