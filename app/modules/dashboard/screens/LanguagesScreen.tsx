import { PlaceholderScreen } from '../../_templates/PlaceholderScreen';
import { SafeAreaView, View, ScrollView } from 'react-native';
import { Input, Button, Layout, Datepicker, Text, Select, SelectItem, IndexPath } from '@ui-kitten/components';
import {BackButton} from '../../../shared/components/BackButton';
import {Header} from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';

export const LanguagesScreen = () => (
    <SafeAreaView style={globalStyles.safeAreaView}>
    <Header />
    <Layout style={globalStyles.layout}>
    <BackButton title="Languages" />
      <ScrollView showsVerticalScrollIndicator={false}>
      <PlaceholderScreen screenName="Languages" />
      </ScrollView>
    </Layout>
  </SafeAreaView>
); 