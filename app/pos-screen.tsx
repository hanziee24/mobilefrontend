import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { router } from 'expo-router';
import { posAPI } from '../services/api';

interface Product { id: number; name: string; price: string; stock: number; category_name: string; }
interface CartItem { product: Product; quantity: number; }
interface Receipt { receipt_number: string; items: any[]; subtotal: string; discount: string; total: string; amount_tendered: string; change: string; payment_method: string; cashier_name: string; created_at: string; }

export default function POSScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'GCASH'>('CASH');
  const [discount, setDiscount] = useState('0');
  const [amountTendered, setAmountTendered] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [camPermission, setCamPermission] = useState<boolean | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([posAPI.getProducts(), posAPI.getCategories()]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch { Alert.alert('Error', 'Failed to load products'); }
    finally { setLoading(false); }
  };

  const loadProducts = async () => {
    try {
      const res = await posAPI.getProducts({ category: selectedCategory ?? undefined, search: search || undefined });
      setProducts(res.data);
    } catch {}
  };

  useEffect(() => { loadProducts(); }, [selectedCategory, search]);

  const openScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCamPermission(status === 'granted');
    scannedRef.current = false;
    setScanning(true);
  };

  const handleScan = async ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanning(false);
    try {
      const res = await posAPI.getProductByBarcode(data);
      addToCart(res.data);
      Alert.alert('Added', `${res.data.name} added to cart.`);
    } catch (e: any) {
      Alert.alert('Not Found', e.response?.data?.error || 'Product not found.');
    }
  };

  const addToCart = (product: Product) => {
    if (product.stock === 0) { Alert.alert('Out of Stock', `${product.name} is out of stock.`); return; }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { Alert.alert('Stock Limit', `Only ${product.stock} available.`); return prev; }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.product.id !== productId)); return; }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const subtotal = cart.reduce((sum, i) => sum + parseFloat(i.product.price) * i.quantity, 0);
  const discountNum = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountNum);
  const change = paymentMethod === 'CASH' ? Math.max(0, (parseFloat(amountTendered) || 0) - total) : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) { Alert.alert('Empty Cart', 'Add items first.'); return; }
    if (paymentMethod === 'CASH' && (parseFloat(amountTendered) || 0) < total) {
      Alert.alert('Insufficient', 'Amount tendered is less than total.'); return;
    }
    setSubmitting(true);
    try {
      const res = await posAPI.checkout({
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
        payment_method: paymentMethod,
        discount: discountNum,
        amount_tendered: parseFloat(amountTendered) || total,
      });
      setReceipt(res.data);
      setCart([]);
      setDiscount('0');
      setAmountTendered('');
      setShowCart(false);
      loadProducts();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Checkout failed');
    } finally { setSubmitting(false); }
  };

  if (receipt) return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 30 }} />
        <Text style={styles.title}>Receipt</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.receiptCard}>
          <Text style={styles.receiptTitle}>🧾 Sales Receipt</Text>
          <Text style={styles.receiptNum}>{receipt.receipt_number}</Text>
          <Text style={styles.receiptSub}>Cashier: {receipt.cashier_name}</Text>
          <Text style={styles.receiptSub}>{new Date(receipt.created_at).toLocaleString()}</Text>
          <View style={styles.divider} />
          {receipt.items.map((item: any, i: number) => (
            <View key={i} style={styles.receiptRow}>
              <Text style={styles.receiptItem}>{item.product_name} x{item.quantity}</Text>
              <Text style={styles.receiptItemAmt}>₱{parseFloat(item.subtotal).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Subtotal</Text><Text style={styles.receiptVal}>₱{parseFloat(receipt.subtotal).toFixed(2)}</Text></View>
          {parseFloat(receipt.discount) > 0 && <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Discount</Text><Text style={[styles.receiptVal, { color: '#4CAF50' }]}>-₱{parseFloat(receipt.discount).toFixed(2)}</Text></View>}
          <View style={styles.receiptRow}><Text style={[styles.receiptLabel, { fontWeight: 'bold' }]}>Total</Text><Text style={styles.receiptTotal}>₱{parseFloat(receipt.total).toFixed(2)}</Text></View>
          <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Payment</Text><Text style={styles.receiptVal}>{receipt.payment_method}</Text></View>
          {receipt.payment_method === 'CASH' && <>
            <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Tendered</Text><Text style={styles.receiptVal}>₱{parseFloat(receipt.amount_tendered).toFixed(2)}</Text></View>
            <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Change</Text><Text style={[styles.receiptVal, { color: '#ED1C24', fontWeight: 'bold' }]}>₱{parseFloat(receipt.change).toFixed(2)}</Text></View>
          </>}
        </View>
        <TouchableOpacity style={styles.newSaleBtn} onPress={() => setReceipt(null)}>
          <Text style={styles.newSaleBtnText}>New Sale</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/cashier-dashboard')}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Point of Sale</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.historyBtn} onPress={() => router.push('/pos-sales-history')}>
            <Text style={styles.historyBtnText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartBadgeBtn} onPress={() => setShowCart(true)}>
            <Text style={styles.cartIcon}>🛒</Text>
            {cart.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{cart.reduce((s, i) => s + i.quantity, 0)}</Text></View>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput style={styles.searchInput} placeholder="Search products..." value={search} onChangeText={setSearch} placeholderTextColor="#999" />
        <TouchableOpacity style={styles.scanBtn} onPress={openScanner}>
          <Text style={styles.scanBtnText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 15, gap: 8 }}>
        <TouchableOpacity style={[styles.catChip, !selectedCategory && styles.catChipActive]} onPress={() => setSelectedCategory(null)}>
          <Text style={[styles.catChipText, !selectedCategory && styles.catChipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map(c => (
          <TouchableOpacity key={c.id} style={[styles.catChip, selectedCategory === c.id && styles.catChipActive]} onPress={() => setSelectedCategory(c.id)}>
            <Text style={[styles.catChipText, selectedCategory === c.id && styles.catChipTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products */}
      {loading ? <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={products}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.productGrid}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.productCard, item.stock === 0 && styles.productCardOOS]} onPress={() => addToCart(item)}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productCategory}>{item.category_name || 'Uncategorized'}</Text>
              <Text style={styles.productPrice}>₱{parseFloat(item.price).toFixed(2)}</Text>
              <Text style={[styles.productStock, item.stock <= 5 && { color: '#ED1C24' }]}>
                {item.stock === 0 ? 'Out of Stock' : `Stock: ${item.stock}`}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No products found</Text>}
        />
      )}

      {/* Cart Modal */}
      <Modal visible={showCart} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowCart(false)}><Text style={styles.backBtn}>✕</Text></TouchableOpacity>
            <Text style={styles.title}>Cart</Text>
            <View style={{ width: 30 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: 40 }}>
            {cart.length === 0 ? <Text style={styles.emptyText}>Cart is empty</Text> : cart.map(item => (
              <View key={item.product.id} style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.product.name}</Text>
                  <Text style={styles.cartItemPrice}>₱{parseFloat(item.product.price).toFixed(2)} each</Text>
                </View>
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, item.quantity - 1)}><Text style={styles.qtyBtnText}>−</Text></TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, item.quantity + 1)}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                </View>
                <Text style={styles.cartItemSubtotal}>₱{(parseFloat(item.product.price) * item.quantity).toFixed(2)}</Text>
              </View>
            ))}

            {cart.length > 0 && <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryVal}>₱{subtotal.toFixed(2)}</Text></View>

                <Text style={styles.inputLabel}>Discount (₱)</Text>
                <TextInput style={styles.input} value={discount} onChangeText={setDiscount} keyboardType="numeric" placeholderTextColor="#999" />

                <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { fontWeight: 'bold' }]}>Total</Text><Text style={styles.totalText}>₱{total.toFixed(2)}</Text></View>

                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.methodRow}>
                  {(['CASH', 'GCASH'] as const).map(m => (
                    <TouchableOpacity key={m} style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]} onPress={() => setPaymentMethod(m)}>
                      <Text style={[styles.methodBtnText, paymentMethod === m && styles.methodBtnTextActive]}>{m === 'CASH' ? '💵 Cash' : '📱 GCash'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {paymentMethod === 'CASH' && <>
                  <Text style={styles.inputLabel}>Amount Tendered (₱)</Text>
                  <TextInput style={styles.input} value={amountTendered} onChangeText={setAmountTendered} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#999" />
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Change</Text><Text style={[styles.summaryVal, { color: '#ED1C24', fontWeight: 'bold' }]}>₱{change.toFixed(2)}</Text></View>
                </>}
              </View>

              <TouchableOpacity style={[styles.checkoutBtn, submitting && { backgroundColor: '#ccc' }]} onPress={handleCheckout} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutBtnText}>Checkout — ₱{total.toFixed(2)}</Text>}
              </TouchableOpacity>
            </>}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={scanning} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.scanHeader}>
            <TouchableOpacity onPress={() => setScanning(false)}>
              <Text style={styles.scanClose}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={styles.scanTitle}>Scan Barcode</Text>
            <View style={{ width: 60 }} />
          </View>
          {camPermission === false ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff' }}>Camera permission denied</Text>
            </View>
          ) : (
            <CameraView
              style={{ flex: 1 }}
              onBarcodeScanned={handleScan}
              barcodeScannerSettings={{ barcodeTypes: ['code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'] }}
            >
              <View style={styles.scanOverlay}>
                <View style={styles.scanBox} />
                <Text style={styles.scanHint}>Point at a barcode</Text>
              </View>
            </CameraView>
          )}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' },
  historyBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cartBadgeBtn: { position: 'relative', padding: 4 },
  cartIcon: { fontSize: 26 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#fff', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#ED1C24' },
  searchRow: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  scanBtn: { backgroundColor: '#ED1C24', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  scanBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  catScroll: { maxHeight: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', alignSelf: 'center' },
  catChipActive: { backgroundColor: '#ED1C24' },
  catChipText: { fontSize: 13, color: '#666', fontWeight: '600' },
  catChipTextActive: { color: '#fff' },
  productGrid: { padding: 10 },
  productCard: { flex: 1, margin: 6, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  productCardOOS: { opacity: 0.5 },
  productName: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  productCategory: { fontSize: 11, color: '#999', marginBottom: 6 },
  productPrice: { fontSize: 18, fontWeight: 'bold', color: '#ED1C24', marginBottom: 4 },
  productStock: { fontSize: 11, color: '#666' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, gap: 10 },
  cartItemName: { fontSize: 14, fontWeight: '600', color: '#333' },
  cartItemPrice: { fontSize: 12, color: '#999', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ED1C24', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  qtyText: { fontSize: 16, fontWeight: 'bold', color: '#333', minWidth: 24, textAlign: 'center' },
  cartItemSubtotal: { fontSize: 14, fontWeight: 'bold', color: '#333', minWidth: 70, textAlign: 'right' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 10, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryVal: { fontSize: 14, color: '#333', fontWeight: '600' },
  totalText: { fontSize: 20, fontWeight: 'bold', color: '#ED1C24' },
  inputLabel: { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#f9f9f9', marginBottom: 10 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  methodBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 2, borderColor: '#ddd', alignItems: 'center' },
  methodBtnActive: { borderColor: '#ED1C24', backgroundColor: '#FFF0F0' },
  methodBtnText: { fontSize: 14, fontWeight: '600', color: '#666' },
  methodBtnTextActive: { color: '#ED1C24' },
  checkoutBtn: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  scanHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#111' },
  scanClose: { color: '#fff', fontSize: 15 },
  scanTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  scanOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scanBox: { width: 240, height: 160, borderWidth: 2, borderColor: '#ED1C24', borderRadius: 8, marginBottom: 20 },
  scanHint: { color: '#fff', fontSize: 14 },
  receiptCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20 },
  receiptTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 4 },
  receiptNum: { fontSize: 13, color: '#ED1C24', textAlign: 'center', fontWeight: '600', marginBottom: 4 },
  receiptSub: { fontSize: 12, color: '#999', textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  receiptItem: { fontSize: 13, color: '#333', flex: 1 },
  receiptItemAmt: { fontSize: 13, color: '#333', fontWeight: '600' },
  receiptLabel: { fontSize: 14, color: '#666' },
  receiptVal: { fontSize: 14, color: '#333', fontWeight: '600' },
  receiptTotal: { fontSize: 18, fontWeight: 'bold', color: '#ED1C24' },
  newSaleBtn: { backgroundColor: '#ED1C24', padding: 16, borderRadius: 12, alignItems: 'center' },
  newSaleBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
