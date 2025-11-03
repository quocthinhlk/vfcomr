import { PlaceholderScreen } from '../../_templates/PlaceholderScreen';
import { SafeAreaView, View, ScrollView } from 'react-native';
import { Input, Button, Layout, Datepicker, Text, Select, SelectItem, IndexPath } from '@ui-kitten/components';
import {BackButton} from '../../../shared/components/BackButton';
import {Header} from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';

export const GenerateReportsScreen = () => (
    <SafeAreaView style={globalStyles.safeAreaView}>
    <Layout style={globalStyles.layout}>
    <Header title="Generate Reports" />
      <ScrollView showsVerticalScrollIndicator={false}>
      <PlaceholderScreen screenName="Generate Reports" />
      </ScrollView>
    </Layout>
  </SafeAreaView>
); 