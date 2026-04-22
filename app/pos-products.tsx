import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { posAPI } from '../services/api';

export default function ProductManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [restockingId, setRestockingId] = useState<number | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const restockOptions = [1, 5, 10];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([posAPI.getAllProducts(), posAPI.getCategories()]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch {}
    finally { setLoading(false); }
  };

  const openForm = (product?: any) => {
    if (product) {
      setEditing(product);
      setName(product.name);
      setPrice(product.price.toString());
      setStock(product.stock.toString());
      setBarcode(product.barcode || '');
      setCategoryId(product.category);
    } else {
      setEditing(null);
      setName(''); setPrice(''); setStock(''); setBarcode(''); setCategoryId(null);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name || !price || !stock) { Alert.alert('Error', 'Name, price and stock are required'); return; }
    setSaving(true);
    try {
      const data = { name, price: parseFloat(price), stock: parseInt(stock), barcode: barcode || null, category: categoryId, is_active: true };
      if (editing) {
        await posAPI.updateProduct(editing.id, data);
      } else {
        await posAPI.createProduct(data);
      }
      setShowForm(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.barcode?.[0] || 'Failed to save product');
    } finally { setSaving(false); }
  };

  const handleDelete = (product: any) => {
    Alert.alert('Delete Product', `Delete "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await posAPI.updateProduct(product.id, { is_active: false }); loadData(); }
        catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const handleRestock = async (product: any, qty: number) => {
    if (restockingId) return;
    setRestockingId(product.id);
    try {
      await posAPI.restockProduct(product.id, qty);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to restock');
    } finally {
      setRestockingId(null);
    }
  };
  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) { Alert.alert('Error', 'Category name is required'); return; }
    setSavingCategory(true);
    try {
      await posAPI.createCategory({ name: trimmed });
      setNewCategory('');
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to add category');
    } finally {
      setSavingCategory(false);
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Products</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowCategoryModal(true)}><Text style={styles.catBtn}>Categories</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => openForm()}><Text style={styles.addBtn}>+ Add</Text></TouchableOpacity>
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={products}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => (
            <View style={[styles.productRow, !item.is_active && { opacity: 0.4 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productSub}>{item.category_name || 'No category'} • Stock: {item.stock}</Text>
                <View style={styles.restockRow}>
                  <Text style={styles.restockLabel}>Restock:</Text>
                  {restockOptions.map(qty => (
                    <TouchableOpacity
                      key={qty}
                      style={[styles.restockBtn, restockingId === item.id && { opacity: 0.5 }]}
                      onPress={() => handleRestock(item, qty)}
                      disabled={restockingId === item.id}
                    >
                      <Text style={styles.restockBtnText}>+{qty}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Text style={styles.productPrice}>₱{parseFloat(item.price).toFixed(2)}</Text>
              <TouchableOpacity style={styles.editBtn} onPress={() => openForm(item)}><Text style={styles.editBtnText}>✏️</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}><Text style={styles.deleteBtnText}>🗑️</Text></TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No products yet</Text>}
        />
      )}

      <Modal visible={showForm} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={styles.backBtn}>✕</Text></TouchableOpacity>
            <Text style={styles.title}>{editing ? 'Edit Product' : 'Add Product'}</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Product name" placeholderTextColor="#999" />

            <Text style={styles.label}>Price (₱) *</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#999" />

            <Text style={styles.label}>Stock *</Text>
            <TextInput style={styles.input} value={stock} onChangeText={setStock} keyboardType="numeric" placeholder="0" placeholderTextColor="#999" />

            <Text style={styles.label}>Barcode (optional)</Text>
            <TextInput style={styles.input} value={barcode} onChangeText={setBarcode} placeholder="Scan or type barcode" placeholderTextColor="#999" />

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.catChip, !categoryId && styles.catChipActive]} onPress={() => setCategoryId(null)}>
                  <Text style={[styles.catChipText, !categoryId && styles.catChipTextActive]}>None</Text>
                </TouchableOpacity>
                {categories.map(c => (
                  <TouchableOpacity key={c.id} style={[styles.catChip, categoryId === c.id && styles.catChipActive]} onPress={() => setCategoryId(c.id)}>
                    <Text style={[styles.catChipText, categoryId === c.id && styles.catChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.saveBtn, saving && { backgroundColor: '#ccc' }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Add Product'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showCategoryModal} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}><Text style={styles.backBtn}>X</Text></TouchableOpacity>
            <Text style={styles.title}>Categories</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <Text style={styles.label}>New Category</Text>
            <View style={styles.categoryRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={newCategory}
                onChangeText={setNewCategory}
                placeholder="e.g. Beverages"
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={[styles.addCategoryBtn, savingCategory && { backgroundColor: '#ccc' }]} onPress={handleAddCategory} disabled={savingCategory}>
                {savingCategory ? <ActivityIndicator color="#fff" /> : <Text style={styles.addCategoryBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Existing Categories</Text>
            {categories.length === 0 ? (
              <Text style={styles.emptyText}>No categories yet</Text>
            ) : categories.map(c => (
              <View key={c.id} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{c.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#ED1C24' },
  backBtn: { fontSize: 26, color: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  addBtn: { fontSize: 15, color: '#fff', fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catBtn: { fontSize: 13, color: '#fff', fontWeight: '700' },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, gap: 10 },
  productName: { fontSize: 14, fontWeight: '600', color: '#333' },
  productSub: { fontSize: 12, color: '#999', marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#ED1C24', marginRight: 8 },
  editBtn: { padding: 6 },
  editBtnText: { fontSize: 18 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 18 },
  restockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  restockLabel: { fontSize: 11, color: '#777', fontWeight: '600' },
  restockBtn: { backgroundColor: '#ffe8ea', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  restockBtnText: { fontSize: 11, color: '#ED1C24', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 15, backgroundColor: '#fff', marginBottom: 4 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0' },
  catChipActive: { backgroundColor: '#ED1C24' },
  catChipText: { fontSize: 13, color: '#666', fontWeight: '600' },
  catChipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#ED1C24', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  addCategoryBtn: { backgroundColor: '#ED1C24', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  addCategoryBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  categoryItem: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  categoryName: { fontSize: 14, fontWeight: '600', color: '#333' },
});
