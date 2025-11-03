import { ImageSourcePropType } from 'react-native';

const iconUp = require('../../../../app/assets/images/icon-up.png');
const iconDown = require('../../../../app/assets/images/icon-down.png');
const iconChurch = require('../../../../app/assets/images/church.png');
const iconGrowth = require('../../../../app/assets/images/growth.png');
const iconRecord = require('../../../../app/assets/images/record.png');
const iconPlanting = require('../../../../app/assets/images/planting.png');
const iconPeople = require('../../../../app/assets/images/people.png');
const iconNations = require('../../../../app/assets/images/nations.png');
const statImage = require('../../../../app/assets/images/upload.png');

export const profileImageUrl =
  'https://scontent.fsgn21-1.fna.fbcdn.net/v/t39.30808-6/483815680_3432402520224723_7119649875353383235_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=PM52YMq_wZAQ7kNvwG5eOeS&_nc_oc=AdnUs2KzGLwKTOwB05IAcWimMoZdueZggFvaUcVRU436U7_26MSdoaCNNmVWOlh97do&_nc_zt=23&_nc_ht=scontent.fsgn21-1.fna&_nc_gid=496hs3hqNHC2UChpxN8AxQ&oh=00_AfTlD2CeIgwWk-NKCMlcDJhaGVvjS1F3G-7NlD2URXDNHw&oe=6877BD5B';

export interface StatItem {
  value: string;
  label: string;
  icon: ImageSourcePropType;
}

export const stats: StatItem[] = [
  {value: '40', label: 'Churches', icon: iconChurch},
  {value: '500', label: 'People', icon: iconPeople},
  {value: '5%', label: 'Churches Growing', icon: iconGrowth},
  {value: '20', label: 'Churches Recording', icon: iconRecord},
  {value: '2', label: 'Nations', icon: iconNations},
  {value: '500', label: 'Churches with CGs', icon: iconChurch},
  {value: '300', label: 'Churches with GT/LIW', icon: iconChurch},
  {value: '20', label: 'Churches with MFP', icon: iconChurch},
  {value: '30', label: 'Churches Planting', icon: iconPlanting},
  {value: '530', label: 'Churches Visited', icon: iconRecord},
];

export const icons = {
  iconUp,
  iconDown,
  statImage,
}; 