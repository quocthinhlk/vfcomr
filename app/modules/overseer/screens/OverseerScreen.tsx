import React from 'react';
import {
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {Text, Button} from '@ui-kitten/components';
import { useNavigation } from '@react-navigation/native';
import { BackButton } from '../../../shared/components/BackButton';
import { profileImageUrl, stats } from '../config/overseer.constants';
import { overseerStyles } from '../styles';
import { MenuItem } from '../components/MenuItem';
import { useOverseerStats } from '../hooks/useOverseerStats';

export default function OverseerScreen() {
  const navigation = useNavigation();
  const { showAllStats, leftColumn, rightColumn, toggleShowAllStats, icons } = useOverseerStats();

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={{flex: 1}}>
        <BackButton style={{marginLeft: 15, marginTop: 15}} textStyle={overseerStyles.backButton} />
        <ScrollView style={{flex: 1}}>
          <View style={{flex: 1, paddingHorizontal: 15}}>
            <View style={overseerStyles.header}>
              <Image source={{uri: profileImageUrl}} style={overseerStyles.avatar} />
              <View style={{flex: 1}}>
                <Text style={overseerStyles.name}>Thinh Truong Quoc</Text>
                <Text style={overseerStyles.role}>Area Leader Southern Africa</Text>
                <Text style={overseerStyles.country}>Vietnam</Text>
              </View>
              <TouchableOpacity>
                <Image source={icons.statImage} style={{width: 24, height: 24}} />
              </TouchableOpacity>
            </View>
            <View style={overseerStyles.statsGrid}>
              <View style={overseerStyles.statsColumn}>
                {leftColumn.map(item => (
                  <View key={item.label} style={overseerStyles.statBox}>
                    <Image source={item.icon} style={overseerStyles.statIcon} />
                    <View>
                      <Text style={overseerStyles.statValue}>{item.value}</Text>
                      <Text style={overseerStyles.statLabel}>{item.label}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={overseerStyles.statsColumn}>
                {rightColumn.map(item => (
                  <View key={item.label} style={overseerStyles.statBox}>
                    <Image source={item.icon} style={overseerStyles.statIcon} />
                    <View>
                      <Text style={overseerStyles.statValue}>{item.value}</Text>
                      <Text style={overseerStyles.statLabel}>{item.label}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <TouchableOpacity
              onPress={toggleShowAllStats}
              style={{alignSelf: 'flex-end', marginVertical: 8}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={overseerStyles.viewLess}>
                  {showAllStats ? 'View less ' : 'View more '}
                </Text>
                <Image
                  source={showAllStats ? icons.iconUp : icons.iconDown}
                  style={overseerStyles.arrowIcon}
                />
              </View>
            </TouchableOpacity>
            <View style={overseerStyles.menuList}>
              <MenuItem label="Monthly Data" icon={icons.statImage} />
              <MenuItem label="Visits & Events" icon={icons.statImage} />
              <MenuItem label="New Pastor & New Church" icon={icons.statImage} />
              <MenuItem label="New Pastor" icon={icons.statImage} />
              <MenuItem label="New Church" icon={icons.statImage} />
              <MenuItem label="Church List" icon={icons.statImage} />
              <MenuItem label="Church Attendance Graph" icon={icons.statImage} />
              <MenuItem label="Churches Planted in the last 10 years" icon={icons.statImage} />
              <MenuItem label="Log Out" icon={icons.statImage} />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
