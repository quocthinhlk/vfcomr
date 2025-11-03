import { ScrollView, FlatList, SectionList } from 'react-native';

// Ensure these exist before setting defaults
if (ScrollView && (ScrollView as any).defaultProps == null) {
  (ScrollView as any).defaultProps = {};
}
if (FlatList && (FlatList as any).defaultProps == null) {
  (FlatList as any).defaultProps = {};
}
if (SectionList && (SectionList as any).defaultProps == null) {
  (SectionList as any).defaultProps = {};
}

// Hide vertical scroll indicators globally
if (ScrollView) {
  (ScrollView as any).defaultProps = {
    ...(ScrollView as any).defaultProps,
    showsVerticalScrollIndicator: false,
  };
}
if (FlatList) {
  (FlatList as any).defaultProps = {
    ...(FlatList as any).defaultProps,
    showsVerticalScrollIndicator: false,
  };
}
if (SectionList) {
  (SectionList as any).defaultProps = {
    ...(SectionList as any).defaultProps,
    showsVerticalScrollIndicator: false,
  };
} 