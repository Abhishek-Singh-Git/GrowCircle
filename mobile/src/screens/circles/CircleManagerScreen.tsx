import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { useCircles } from '../../hooks/useCircles';
import { useCircleStore } from '../../stores/circleStore';

export default function CircleManagerScreen() {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const { createCircle, joinCircle, isLoading } = useCircles();
  const navigation = useNavigation<any>();
  const activeCircle = useCircleStore((s) => s.activeCircle);

  // If user has an active circle and we haven't just created one, show their existing invite code
  const codeToShow = createdCode || activeCircle?.inviteCode;
  const isExisting = !createdCode && activeCircle;

  const handleCreate = async () => {
    if (!name) {
      Toast.show({ type: 'error', text1: 'Circle name is required' });
      return;
    }
    try {
      const circle = await createCircle(name, description);
      setCreatedCode(circle.inviteCode);
      Toast.show({ type: 'success', text1: 'Circle created!' });
    } catch (err: any) {
      const msg = err.message || 'Failed to create circle';
      Toast.show({ type: 'error', text1: msg });
    }
  };

  const handleJoin = async () => {
    if (!inviteCode) {
      Toast.show({ type: 'error', text1: 'Invite code is required' });
      return;
    }
    try {
      await joinCircle(inviteCode);
      Toast.show({ type: 'success', text1: 'Successfully joined circle!' });
      navigation.goBack();
    } catch (err: any) {
      const msg = err.message || 'Failed to join circle';
      Toast.show({ type: 'error', text1: msg });
    }
  };

  const copyToClipboard = async () => {
    if (codeToShow) {
      await Clipboard.setStringAsync(codeToShow);
      Toast.show({ type: 'info', text1: 'Copied to clipboard' });
    }
  };

  const shareCode = async () => {
    if (codeToShow) {
      try {
        await Share.share({
          message: `Join my circle on GrowCircle! Use invite code: ${codeToShow}`,
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Circle Manager</Text>
      
      {codeToShow ? (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>
            {isExisting ? 'Invite Your Partner!' : 'Circle Created Successfully!'}
          </Text>
          <Text style={styles.codeText}>{codeToShow}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={copyToClipboard}>
              <Text style={styles.btnText}>Copy Code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={shareCode}>
              <Text style={styles.btnTextSecondary}>Share</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.btnFinish} onPress={() => navigation.goBack()}>
            <Text style={[styles.btnText, { color: '#000' }]}>Go to Feed</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.tabs}>
            <TouchableOpacity onPress={() => setActiveTab('create')} style={[styles.tab, activeTab === 'create' && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('join')} style={[styles.tab, activeTab === 'join' && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === 'join' && styles.activeTabText]}>Join</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'create' && (
            <View style={styles.form}>
              <TextInput style={styles.input} placeholder="Circle Name" placeholderTextColor="#aaa" value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Description (Optional)" placeholderTextColor="#aaa" value={description} onChangeText={setDescription} />
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Create Circle</Text>}
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'join' && (
            <View style={styles.form}>
              <TextInput style={styles.input} placeholder="Invite Code" placeholderTextColor="#aaa" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />
              <TouchableOpacity style={styles.submitBtn} onPress={handleJoin} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Join Circle</Text>}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  tabs: { flexDirection: 'row', marginBottom: 20 },
  tab: { flex: 1, padding: 15, borderBottomWidth: 2, borderBottomColor: '#333' },
  activeTab: { borderBottomColor: '#fff' },
  tabText: { color: '#888', textAlign: 'center', fontSize: 16 },
  activeTabText: { color: '#fff', fontWeight: 'bold' },
  form: { marginTop: 10 },
  input: { backgroundColor: '#111', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  submitBtn: { backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  successContainer: { alignItems: 'center', backgroundColor: '#111', padding: 30, borderRadius: 15 },
  successText: { color: '#4CAF50', fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  codeText: { color: '#fff', fontSize: 32, fontWeight: 'bold', letterSpacing: 4, marginBottom: 30 },
  row: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  btn: { backgroundColor: '#333', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  btnSecondary: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnTextSecondary: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnFinish: { backgroundColor: '#fff', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
});
