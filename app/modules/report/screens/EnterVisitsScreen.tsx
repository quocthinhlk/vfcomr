import { PlaceholderScreen } from '../../_templates/PlaceholderScreen';
import { SafeAreaView, View, ScrollView } from 'react-native';
import { Input, Button, Layout, Datepicker, Text, Select, SelectItem, IndexPath } from '@ui-kitten/components';
import {BackButton} from '../../../shared/components/BackButton';
import {Header} from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';

export default function EnterVisitsScreen() {
  return (
    <SafeAreaView style={globalStyles.safeAreaView}>
    <Header />
    <Layout style={globalStyles.layout}>
    <BackButton title="Enter Visits" />
      <ScrollView>
      <PlaceholderScreen screenName="Enter Visits" />
      </ScrollView>
    </Layout>
  </SafeAreaView>
  );
} 