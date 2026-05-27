import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';

const MarkdownRenderer = ({ content }) => {
  const { colors: COLORS } = useThemeStore();
  const styles = getStyles(COLORS);

  // Removes common emojis that the AI might still generate despite instructions
  const stripEmojis = (str) => {
    return str.replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
      .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
      .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes Extended
      .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
  };

  const renderInlineStyles = (text) => {
    // Split by ** to find bold sections
    const parts = text.split('**');
    return parts.map((part, index) => {
      // Every odd index in the split array was surrounded by **
      if (index % 2 !== 0) {
        return <Text key={index} style={styles.boldInline}>{part}</Text>;
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const renderContent = () => {
    const lines = content.split('\n');
    
    return lines.map((line, index) => {
      let trimmedLine = line.trim();
      trimmedLine = stripEmojis(trimmedLine).trim(); // Remove emojis and extra spaces left behind

      if (!trimmedLine) return null; // Skip empty lines

      // Divider: ---
      if (trimmedLine === '---') {
        return <View key={index} style={styles.divider} />;
      }

      // Check if it's a heading-like line that is fully bold
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.split('**').length === 3) {
         return (
          <Text key={index} style={styles.boldHeading}>
            {trimmedLine.substring(2, trimmedLine.length - 2)}
          </Text>
        );
      }
      
      // List items: * item or - item
      if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
        const itemText = trimmedLine.substring(2).trim();
        return (
          <View key={index} style={styles.listItem}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} style={styles.listIcon} />
            <Text style={styles.listText}>{renderInlineStyles(itemText)}</Text>
          </View>
        );
      }

      // Simple text with potential inline bold
      return <Text key={index} style={styles.text}>{renderInlineStyles(trimmedLine)}</Text>;
    });
  };

  return <View>{renderContent()}</View>;
};

const getStyles = (COLORS) => StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: COLORS.onPrimaryContainer + '30', // 30 is alpha for transparency
    marginVertical: 14,
  },
  boldHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onPrimaryContainer,
    marginBottom: 8,
    marginTop: 4,
  },
  boldInline: {
    fontWeight: 'bold',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 4,
  },
  listIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.onPrimaryContainer,
    lineHeight: 22,
  },
  text: {
    fontSize: 15,
    color: COLORS.onPrimaryContainer,
    lineHeight: 24,
    marginBottom: 8,
  },
});

export default MarkdownRenderer;
