#!/usr/bin/env ruby
require 'fileutils'

codegen_dir = File.join(__dir__, 'build/generated/ios')
FileUtils.mkdir_p(codegen_dir)

# Create ReactAppDependencyProvider.podspec
react_app_dep_provider_podspec = File.join(codegen_dir, 'ReactAppDependencyProvider.podspec')
File.write(react_app_dep_provider_podspec, <<~PODSPEC
  # Copyright (c) Meta Platforms, Inc. and affiliates.
  #
  # This source code is licensed under the MIT license found in the
  # LICENSE file in the root directory of this source tree.

  version = "0.78.2"
  source = { :git => 'https://github.com/facebook/react-native.git' }
  source[:tag] = "v\#{version}"

  Pod::Spec.new do |s|
    s.name                   = "ReactAppDependencyProvider"
    s.version                = version
    s.summary                = "The third party dependency provider for the app"
    s.homepage               = "https://reactnative.dev/"
    s.documentation_url      = "https://reactnative.dev/"
    s.license                = "MIT"
    s.author                 = "Meta Platforms, Inc. and its affiliates"
    s.platforms              = { :ios => "14.0" }
    s.source                 = source
    s.source_files           = "**/RCTAppDependencyProvider.{h,mm}"

    s.pod_target_xcconfig    = {
      "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
      "DEFINES_MODULE" => "YES"
    }

    s.dependency "ReactCodegen"
  end
PODSPEC
)

# Create ReactCodegen.podspec.json
react_codegen_podspec = File.join(codegen_dir, 'ReactCodegen.podspec.json')
File.write(react_codegen_podspec, <<~JSON
  {
    "name": "ReactCodegen",
    "version": "0.78.2",
    "summary": "Temp pod for generated files for React Native",
    "homepage": "https://facebook.com/",
    "license": "Unlicense",
    "authors": "Facebook",
    "compiler_flags": "-Wno-nullability-completeness -std=c++20",
    "source": {
      "git": ""
    },
    "header_mappings_dir": "./",
    "platforms": {
      "ios": "14.0"
    },
    "source_files": "**/*.{h,mm,cpp}",
    "exclude_files": "RCTAppDependencyProvider.{h,mm}",
    "pod_target_xcconfig": {
      "HEADER_SEARCH_PATHS": "\\"$(PODS_ROOT)/boost\\" \\"$(PODS_ROOT)/RCT-Folly\\" \\"$(PODS_ROOT)/DoubleConversion\\" \\"$(PODS_ROOT)/fast_float/include\\" \\"$(PODS_ROOT)/fmt/include\\" \\"${PODS_ROOT}/Headers/Public/ReactCodegen/react/renderer/components\\" \\"$(PODS_ROOT)/Headers/Private/React-Fabric\\" \\"$(PODS_ROOT)/Headers/Private/React-RCTFabric\\" \\"$(PODS_ROOT)/Headers/Private/Yoga\\" \\"$(PODS_TARGET_SRCROOT)\\"",
      "FRAMEWORK_SEARCH_PATHS": "",
      "OTHER_CPLUSPLUSFLAGS": "$(inherited)"
    },
    "dependencies": {
      "React-jsiexecutor": [],
      "RCT-Folly": [],
      "RCTRequired": [],
      "RCTTypeSafety": [],
      "React-Core": [],
      "React-jsi": [],
      "ReactCommon/turbomodule/bridging": [],
      "ReactCommon/turbomodule/core": [],
      "React-NativeModulesApple": [],
      "glog": [],
      "DoubleConversion": [],
      "React-graphics": [],
      "React-rendererdebug": [],
      "React-Fabric": [],
      "React-FabricImage": [],
      "React-debug": [],
      "React-utils": [],
      "React-featureflags": [],
      "React-RCTAppDelegate": [],
      "hermes-engine": []
    }
  }
JSON
)

# Create header files
header_file = File.join(codegen_dir, 'RCTAppDependencyProvider.h')
File.write(header_file, <<~HEADER
  /*
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */

  #import <Foundation/Foundation.h>

  #if __has_include(<React-RCTAppDelegate/RCTDependencyProvider.h>)
  #import <React-RCTAppDelegate/RCTDependencyProvider.h>
  #elif __has_include(<React_RCTAppDelegate/RCTDependencyProvider.h>)
  #import <React_RCTAppDelegate/RCTDependencyProvider.h>
  #else
  #import "RCTDependencyProvider.h"
  #endif

  NS_ASSUME_NONNULL_BEGIN

  @interface RCTAppDependencyProvider : NSObject <RCTDependencyProvider>

  @end

  NS_ASSUME_NONNULL_END
HEADER
)

mm_file = File.join(codegen_dir, 'RCTAppDependencyProvider.mm')
File.write(mm_file, <<~MM
  /*
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */

  #import "RCTAppDependencyProvider.h"

  @implementation RCTAppDependencyProvider

  - (NSArray<NSString *> *)imageURLLoaderClassNames
  {
    return @[];
  }

  - (NSArray<NSString *> *)imageDataDecoderClassNames
  {
    return @[];
  }

  - (NSArray<NSString *> *)URLRequestHandlerClassNames
  {
    return @[];
  }

  - (NSDictionary<NSString *, Class<RCTComponentViewProtocol>> *)thirdPartyFabricComponents
  {
    return @{};
  }

  @end
MM
)

# Create Props.h for safeareacontext (required by react-native-safe-area-context)
safeareacontext_dir = File.join(codegen_dir, 'react/renderer/components/safeareacontext')
FileUtils.mkdir_p(safeareacontext_dir)

# Props.h
props_file = File.join(safeareacontext_dir, 'Props.h')
File.write(props_file, <<~HEADER
  /**
   * This file was generated by codegen. Do not modify manually.
   * Generated for react-native-safe-area-context
   */
  
  #pragma once
  
  #include <react/renderer/core/Props.h>
  #include <react/renderer/core/PropsParserContext.h>
  #include <react/renderer/graphics/Color.h>
  
  namespace facebook {
  namespace react {
  
  struct SafeAreaContextProps final : public Props {
    SafeAreaContextProps() = default;
    SafeAreaContextProps(
        const PropsParserContext &context,
        const SafeAreaContextProps &sourceProps,
        const RawProps &rawProps);
  
    #pragma mark - Props
  };
  
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(props_file)

# EventEmitters.h
event_emitters_file = File.join(safeareacontext_dir, 'EventEmitters.h')
File.write(event_emitters_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/components/view/ViewEventEmitter.h>
  
  namespace facebook {
  namespace react {
  
  struct RNCSafeAreaProviderEventEmitter : public ViewEventEmitter {
    using ViewEventEmitter::ViewEventEmitter;
    
    struct OnInsetsChange {
      double top;
      double right;
      double bottom;
      double left;
    };
    
    void onInsetsChange(OnInsetsChange value) const;
  };
  
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(event_emitters_file)

# ComponentDescriptors.h
component_descriptors_file = File.join(safeareacontext_dir, 'ComponentDescriptors.h')
File.write(component_descriptors_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/components/safeareacontext/RNCSafeAreaViewComponentDescriptor.h>
  #include <react/renderer/components/safeareacontext/RNCSafeAreaProviderComponentDescriptor.h>
HEADER
) unless File.exist?(component_descriptors_file)

# RCTComponentViewHelpers.h
rct_component_view_helpers_file = File.join(safeareacontext_dir, 'RCTComponentViewHelpers.h')
File.write(rct_component_view_helpers_file, <<~HEADER
  #pragma once
  
  #ifdef __cplusplus
  namespace facebook {
  namespace react {
  
  struct RNCSafeAreaViewProps;
  struct RNCSafeAreaProviderProps;
  
  } // namespace react
  } // namespace facebook
  #endif
HEADER
) unless File.exist?(rct_component_view_helpers_file)

# RNCSafeAreaViewComponentDescriptor.h
component_descriptor_file = File.join(safeareacontext_dir, 'RNCSafeAreaViewComponentDescriptor.h')
File.write(component_descriptor_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/core/ConcreteComponentDescriptor.h>
  #include <react/renderer/components/safeareacontext/RNCSafeAreaViewShadowNode.h>
  
  namespace facebook {
  namespace react {
  
  using RNCSafeAreaViewComponentDescriptor = ConcreteComponentDescriptor<RNCSafeAreaViewShadowNode>;
  
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(component_descriptor_file)

# RNCSafeAreaViewShadowNode.h
shadow_node_file = File.join(safeareacontext_dir, 'RNCSafeAreaViewShadowNode.h')
File.write(shadow_node_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/components/view/ConcreteViewShadowNode.h>
  #include <react/renderer/components/safeareacontext/RNCSafeAreaViewProps.h>
  
  namespace facebook {
  namespace react {
  
  extern const char RNCSafeAreaViewComponentName[];
  
  class RNCSafeAreaViewShadowNode final : public ConcreteViewShadowNode<
    RNCSafeAreaViewComponentName,
    RNCSafeAreaViewProps> {
  public:
    using ConcreteViewShadowNode::ConcreteViewShadowNode;
  };
  
  } // namespace react
  } // namespace facebook
  
  // Component name constant
  namespace facebook {
  namespace react {
  const char RNCSafeAreaViewComponentName[] = "RNCSafeAreaView";
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(shadow_node_file)

# RNCSafeAreaViewProps.h
props_specific_file = File.join(safeareacontext_dir, 'RNCSafeAreaViewProps.h')
File.write(props_specific_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/components/safeareacontext/Props.h>
  
  namespace facebook {
  namespace react {
  
  using RNCSafeAreaViewProps = SafeAreaContextProps;
  
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(props_specific_file)

# RNCSafeAreaProviderComponentDescriptor.h
provider_component_descriptor_file = File.join(safeareacontext_dir, 'RNCSafeAreaProviderComponentDescriptor.h')
File.write(provider_component_descriptor_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/core/ConcreteComponentDescriptor.h>
  #include <react/renderer/components/safeareacontext/RNCSafeAreaProviderShadowNode.h>
  
  namespace facebook {
  namespace react {
  
  using RNCSafeAreaProviderComponentDescriptor = ConcreteComponentDescriptor<RNCSafeAreaProviderShadowNode>;
  
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(provider_component_descriptor_file)

# RNCSafeAreaProviderShadowNode.h
provider_shadow_node_file = File.join(safeareacontext_dir, 'RNCSafeAreaProviderShadowNode.h')
File.write(provider_shadow_node_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/components/view/ConcreteViewShadowNode.h>
  #include <react/renderer/components/safeareacontext/RNCSafeAreaProviderProps.h>
  
  namespace facebook {
  namespace react {
  
  extern const char RNCSafeAreaProviderComponentName[];
  
  class RNCSafeAreaProviderShadowNode final : public ConcreteViewShadowNode<
    RNCSafeAreaProviderComponentName,
    RNCSafeAreaProviderProps> {
  public:
    using ConcreteViewShadowNode::ConcreteViewShadowNode;
  };
  
  } // namespace react
  } // namespace facebook
  
  // Component name constant
  namespace facebook {
  namespace react {
  const char RNCSafeAreaProviderComponentName[] = "RNCSafeAreaProvider";
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(provider_shadow_node_file)

# RNCSafeAreaProviderProps.h
provider_props_file = File.join(safeareacontext_dir, 'RNCSafeAreaProviderProps.h')
File.write(provider_props_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/components/safeareacontext/Props.h>
  
  namespace facebook {
  namespace react {
  
  using RNCSafeAreaProviderProps = SafeAreaContextProps;
  
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(provider_props_file)

# Create codegen files for rnscreens (required by react-native-screens)
rnscreens_dir = File.join(codegen_dir, 'react/renderer/components/rnscreens')
FileUtils.mkdir_p(rnscreens_dir)

# Props.h
rnscreens_props_file = File.join(rnscreens_dir, 'Props.h')
File.write(rnscreens_props_file, <<~HEADER
  /**
   * This file was generated by codegen. Do not modify manually.
   * Generated for react-native-screens
   */
  
  #pragma once
  
  #include <react/renderer/core/Props.h>
  #include <react/renderer/core/PropsParserContext.h>
  #include <react/renderer/graphics/Color.h>
  
  namespace facebook {
  namespace react {
  
  struct RNSScreensProps final : public Props {
    RNSScreensProps() = default;
    RNSScreensProps(
        const PropsParserContext &context,
        const RNSScreensProps &sourceProps,
        const RawProps &rawProps);
  
    #pragma mark - Props
  };
  
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(rnscreens_props_file)

# EventEmitters.h
rnscreens_event_emitters_file = File.join(rnscreens_dir, 'EventEmitters.h')
File.write(rnscreens_event_emitters_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/components/view/ViewEventEmitter.h>
  
  namespace facebook {
  namespace react {
  
  struct RNSBottomTabsHostEventEmitter : public ViewEventEmitter {
    using ViewEventEmitter::ViewEventEmitter;
  };
  
  struct RNSBottomTabsScreenEventEmitter : public ViewEventEmitter {
    using ViewEventEmitter::ViewEventEmitter;
  };
  
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(rnscreens_event_emitters_file)

# ComponentDescriptors.h
rnscreens_component_descriptors_file = File.join(rnscreens_dir, 'ComponentDescriptors.h')
File.write(rnscreens_component_descriptors_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/components/rnscreens/RNSBottomTabsHostComponentDescriptor.h>
  #include <react/renderer/components/rnscreens/RNSBottomTabsScreenComponentDescriptor.h>
HEADER
) unless File.exist?(rnscreens_component_descriptors_file)

# RCTComponentViewHelpers.h
rnscreens_rct_component_view_helpers_file = File.join(rnscreens_dir, 'RCTComponentViewHelpers.h')
File.write(rnscreens_rct_component_view_helpers_file, <<~HEADER
  #pragma once
  
  #ifdef __cplusplus
  namespace facebook {
  namespace react {
  
  struct RNSBottomTabsHostProps;
  struct RNSBottomTabsScreenProps;
  
  } // namespace react
  } // namespace facebook
  #endif
HEADER
) unless File.exist?(rnscreens_rct_component_view_helpers_file)

# RNSBottomTabsHostComponentDescriptor.h
rns_bottom_tabs_host_component_descriptor_file = File.join(rnscreens_dir, 'RNSBottomTabsHostComponentDescriptor.h')
File.write(rns_bottom_tabs_host_component_descriptor_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/core/ConcreteComponentDescriptor.h>
  #include <react/renderer/components/rnscreens/RNSBottomTabsHostShadowNode.h>
  
  namespace facebook {
  namespace react {
  
  using RNSBottomTabsHostComponentDescriptor = ConcreteComponentDescriptor<RNSBottomTabsHostShadowNode>;
  
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(rns_bottom_tabs_host_component_descriptor_file)

# RNSBottomTabsHostShadowNode.h
rns_bottom_tabs_host_shadow_node_file = File.join(rnscreens_dir, 'RNSBottomTabsHostShadowNode.h')
File.write(rns_bottom_tabs_host_shadow_node_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/components/view/ConcreteViewShadowNode.h>
  #include <react/renderer/components/rnscreens/RNSBottomTabsHostProps.h>
  
  namespace facebook {
  namespace react {
  
  extern const char RNSBottomTabsHostComponentName[];
  
  class RNSBottomTabsHostShadowNode final : public ConcreteViewShadowNode<
    RNSBottomTabsHostComponentName,
    RNSBottomTabsHostProps> {
  public:
    using ConcreteViewShadowNode::ConcreteViewShadowNode;
  };
  
  } // namespace react
  } // namespace facebook
  
  // Component name constant
  namespace facebook {
  namespace react {
  const char RNSBottomTabsHostComponentName[] = "RNSBottomTabsHost";
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(rns_bottom_tabs_host_shadow_node_file)

# RNSBottomTabsHostProps.h
rns_bottom_tabs_host_props_file = File.join(rnscreens_dir, 'RNSBottomTabsHostProps.h')
File.write(rns_bottom_tabs_host_props_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/components/rnscreens/Props.h>
  
  namespace facebook {
  namespace react {
  
  using RNSBottomTabsHostProps = RNSScreensProps;
  
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(rns_bottom_tabs_host_props_file)

# RNSBottomTabsScreenComponentDescriptor.h
rns_bottom_tabs_screen_component_descriptor_file = File.join(rnscreens_dir, 'RNSBottomTabsScreenComponentDescriptor.h')
File.write(rns_bottom_tabs_screen_component_descriptor_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/core/ConcreteComponentDescriptor.h>
  #include <react/renderer/components/rnscreens/RNSBottomTabsScreenShadowNode.h>
  
  namespace facebook {
  namespace react {
  
  using RNSBottomTabsScreenComponentDescriptor = ConcreteComponentDescriptor<RNSBottomTabsScreenShadowNode>;
  
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(rns_bottom_tabs_screen_component_descriptor_file)

# RNSBottomTabsScreenShadowNode.h
rns_bottom_tabs_screen_shadow_node_file = File.join(rnscreens_dir, 'RNSBottomTabsScreenShadowNode.h')
File.write(rns_bottom_tabs_screen_shadow_node_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/components/view/ConcreteViewShadowNode.h>
  #include <react/renderer/components/rnscreens/RNSBottomTabsScreenProps.h>
  
  namespace facebook {
  namespace react {
  
  extern const char RNSBottomTabsScreenComponentName[];
  
  class RNSBottomTabsScreenShadowNode final : public ConcreteViewShadowNode<
    RNSBottomTabsScreenComponentName,
    RNSBottomTabsScreenProps> {
  public:
    using ConcreteViewShadowNode::ConcreteViewShadowNode;
  };
  
  } // namespace react
  } // namespace facebook
  
  // Component name constant
  namespace facebook {
  namespace react {
  const char RNSBottomTabsScreenComponentName[] = "RNSBottomTabsScreen";
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(rns_bottom_tabs_screen_shadow_node_file)

# RNSBottomTabsScreenProps.h
rns_bottom_tabs_screen_props_file = File.join(rnscreens_dir, 'RNSBottomTabsScreenProps.h')
File.write(rns_bottom_tabs_screen_props_file, <<~HEADER
  #pragma once
  
  #include <react/renderer/components/rnscreens/Props.h>
  
  namespace facebook {
  namespace react {
  
  using RNSBottomTabsScreenProps = RNSScreensProps;
  
  } // namespace react
  } // namespace facebook
HEADER
) unless File.exist?(rns_bottom_tabs_screen_props_file)

puts "Created codegen files in #{codegen_dir}"


