import { StyleSheet } from 'react-native';
import { COLORS } from '../../shared/constants/colors';

export const overseerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 32,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  role: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 2,
  },
  country: {
    fontSize: 15,
    color: '#757575',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsColumn: {
    width: '50%',
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bdbdbd',
    borderRadius: 6,
    padding: 3,
    margin: 3,
    backgroundColor: '#fff',
  },
  statIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  arrowIcon: {
    width: 18,
    height: 18,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.mainColor,
  },
  statLabel: {
    fontSize: 13,
    color: '#757575',
  },
  viewLess: {
    textAlign: 'right',
    color: '#757575',
    marginRight: 16,
    marginTop: 4,
    marginBottom: 8,
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
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 16,
    resizeMode: 'contain',
  },
  menuLabel: {
    fontSize: 16,
    color: '#1976d2',
  },
  backButton: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 16,
    color: COLORS.mainColor,
    fontWeight: 'bold',
  },
}); 