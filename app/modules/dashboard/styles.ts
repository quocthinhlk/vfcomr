import { StyleSheet } from 'react-native';
import { COLORS } from '../../shared/constants/colors';

export const dashboardStyles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  button: {
    marginVertical: 8,
    width: '80%',
  },
  title: {
    // marginBottom: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginLeft: 15,
  },
  menuList: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuLabel: {
    fontSize: 16,
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
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  profileTextContainer: {
    justifyContent: 'center',
  },
  profileName: {
    fontWeight: 'bold',
  },
  profileRole: {
    fontSize: 12,
  },
  profileLocation: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  headerEditButton: {
    padding: 8,
  },
  headerEditIcon: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
  },
  headerMenuButton: {
    padding: 8,
  },
  // Stat Card Styles
  statCardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    // paddingHorizontal: 15,
    marginTop: 20,
  },
  statCard: {
    width: '48%',
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
    resizeMode: 'contain',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontWeight: 'bold',
    fontSize: 16,
    color: COLORS.mainColor,
  },
  statSecondaryValue: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  viewMoreButton: {
    alignSelf: 'flex-end',
  },
  viewMoreText: {
    color: COLORS.mainColor,
    fontSize: 15,
  },
  actionSection: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: {
    width: 20,
    height: 20,
    marginRight: 15,
    resizeMode: 'contain',
  },
  actionLabel: {
    fontSize: 16,
    flex: 1,
  },
  actionArrow: {
    width: 15,
    height: 15,
    resizeMode: 'contain',
  },
});

