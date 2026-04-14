import { StyleSheet } from 'react-native';
import { COLORS } from '../../shared/constants/colors';
import { fs, ws, hs, ms, rs } from '../../shared/utils/scale';

export const dashboardStyles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',
    paddingHorizontal: ms(15),
    backgroundColor: '#fff',
  },
  button: {
    marginVertical: ms(8),
    width: '80%',
  },
  title: {
    // marginBottom: 20,
    fontWeight: 'bold',
    marginTop: ms(10),
    marginLeft: ms(15),
  },
  menuList: {
    marginTop: ms(8),
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(16),
    paddingHorizontal: ms(16),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuLabel: {
    fontSize: fs(16),
    color: '#1976d2',
  },
  // New styles for DashboardHeader
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(10),
    paddingHorizontal: ms(15),
  },
  profileImage: {
    width: ws(50),
    height: ws(50),
    borderRadius: 25,
    marginRight: ms(10),
  },
  profileTextContainer: {
    justifyContent: 'center',
  },
  profileName: {
    fontWeight: 'bold',
  },
  profileRole: {
    fontSize: fs(12),
  },
  profileLocation: {
    fontSize: fs(12),
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: ms(15),
  },
  headerEditButton: {
    padding: ms(8),
  },
  headerEditIcon: {
    width: ws(12),
    height: hs(12),
    resizeMode: 'contain',
  },
  headerMenuButton: {
    padding: ms(8),
  },
  // Stat Card Styles
  statCardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: ms(6),
    gap: ms(1),
  },
  statCard: {
    width: '48%',
    marginBottom: ms(10),
    padding: ms(5),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: ws(25),
    height: ws(25),
    marginRight: ms(10),
    resizeMode: 'contain',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontWeight: 'bold',
    fontSize: fs(16),
    color: COLORS.mainColor,
  },
  statSecondaryValue: {
    fontSize: fs(10),
    color: '#888',
    marginTop: ms(2),
  },
  statLabel: {
    fontSize: fs(11),
    color: '#888',
  },
  viewMoreButton: {
    alignSelf: 'flex-end',
  },
  viewMoreText: {
    color: COLORS.mainColor,
    fontSize: fs(15),
  },
  actionSection: {
    marginTop: ms(20),
    paddingHorizontal: ms(15),
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(15),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: {
    width: ws(20),
    height: hs(20),
    marginRight: ms(15),
    resizeMode: 'contain',
  },
  actionLabel: {
    fontSize: fs(16),
    flex: 1,
  },
  actionArrow: {
    width: ws(15),
    height: hs(15),
    resizeMode: 'contain',
  },
});

