import { PlaceholderScreen } from '../../_templates/PlaceholderScreen';
import { BackButton } from '../../../shared/components/BackButton';
import { SafeAreaView, View, ScrollView } from 'react-native';
import { Input, Button, Layout, Datepicker, Text, Select, SelectItem, IndexPath } from '@ui-kitten/components';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';

export const EventTypeScreen = () => (
  <SafeAreaView style={globalStyles.safeAreaView}>
    <Header />
    <Layout style={globalStyles.layout}>
      <BackButton title="Event Type" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ flex: 1 }}>
          <PlaceholderScreen screenName="Event Type" />
        </View>
      </ScrollView>
    </Layout>
  </SafeAreaView>
); 