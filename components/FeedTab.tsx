import { FC } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface FeedTabProps {
  title: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const FeedTab: FC<FeedTabProps> = ({ title, activeTab, setActiveTab }) => {
  return (
    <TouchableOpacity style={styles.tabContainer} onPress={() => setActiveTab(title)}>
      <Text style={title === activeTab ? styles.activeTabText : styles.tabText}>{title}</Text>

      {title === activeTab && <View style={styles.activeDot} />}
    </TouchableOpacity>
  );
};

export default FeedTab;

const styles = StyleSheet.create({
  tabContainer: {
    alignItems: "center",
    // marginBottom: 20,
  },
  tabText: {
    color: "grey",
    fontSize: 18,
    fontWeight: "600",
  },
  activeTabText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  activeDot: {
    width: 20,
    height: 2,
    // borderRadius: 3,
    backgroundColor: "white",
    marginTop: 5,
  },
});
