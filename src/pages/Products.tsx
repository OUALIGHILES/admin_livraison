import { useState, useEffect } from 'react';
import { supabase, supabaseService } from '../lib/supabase';
import { uploadImageToStorage, deleteImageFromStorage } from '../lib/storage';
import { Product } from '../types/database';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    admin_price: '',
    profit_amount: '',
    note: '',
    photo_url: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      // Use service role client to bypass RLS that might cause recursion
      console.log('Loading products with service client');
      const { data, error } = await supabaseService
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading products:', error);
        throw error;
      }
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate the input
      const adminPrice = parseFloat(formData.admin_price);
      if (isNaN(adminPrice)) {
        alert('Please enter a valid admin price');
        return;
      }

      const profitAmount = formData.profit_amount ? parseFloat(formData.profit_amount) : null;
      if (formData.profit_amount && isNaN(profitAmount!)) {
        alert('Please enter a valid profit amount');
        return;
      }

      let photoUrl = formData.photo_url;

      // Handle image upload if a new image is selected
      if (imageFile) {
        setUploading(true);
        try {
          photoUrl = await uploadImageToStorage(imageFile, 'products');
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          alert(`Error uploading image: ${(uploadError as Error).message}`);
          return;
        } finally {
          setUploading(false);
        }
      }

      console.log('Attempting to save product with service client');
      if (editingProduct) {
        const { error } = await supabaseService
          .from('products')
          .update({
            name: formData.name,
            admin_price: adminPrice,
            profit_amount: profitAmount,
            note: formData.note || null,
            photo_url: photoUrl || null,
          })
          .eq('id', editingProduct.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }

        console.log('Product updated successfully');
      } else {
        const { error } = await supabaseService.from('products').insert([{
          name: formData.name,
          admin_price: adminPrice,
          profit_amount: profitAmount,
          note: formData.note || null,
          photo_url: photoUrl || null,
        }]);

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }

        console.log('Product created successfully');
      }

      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        admin_price: '',
        profit_amount: '',
        note: '',
        photo_url: ''
      });
      setImageFile(null);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert(`Error saving product: ${(error as any).message || 'Unknown error'}`);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      admin_price: product.admin_price.toString(),
      profit_amount: product.profit_amount?.toString() || '',
      note: product.note || '',
      photo_url: product.photo_url || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabaseService.from('products').delete().eq('id', id);
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const openNewModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      admin_price: '',
      profit_amount: '',
      note: '',
      photo_url: ''
    });
    setShowModal(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Products</h1>
        <button
          onClick={openNewModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Product Image</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Product Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Admin Price</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Profit Amount</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Created</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  {product.photo_url ? (
                    <img
                      src={product.photo_url}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded border border-slate-200">
                      <span className="text-xs text-slate-500">No Image</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">{product.name}</td>
                <td className="px-6 py-4 text-sm text-slate-900">${product.admin_price.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-slate-900">
                  {product.profit_amount ? `$${product.profit_amount.toFixed(2)}` : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(product.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-600 hover:text-blue-800 p-2 inline-flex transition-colors"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-800 p-2 inline-flex transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Admin Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.admin_price}
                  onChange={(e) => setFormData({ ...formData, admin_price: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount of the Profit ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.profit_amount}
                  onChange={(e) => setFormData({ ...formData, profit_amount: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Note of this Product
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">Upload a product image (max 5MB)</p>

                {imageFile && (
                  <div className="mt-2">
                    <p className="text-sm text-slate-600">Selected: {imageFile.name}</p>
                  </div>
                )}

                {uploading && (
                  <div className="mt-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-slate-600 mt-1">Uploading...</p>
                  </div>
                )}

                {formData.photo_url && !imageFile && (
                  <div className="mt-2">
                    <p className="text-sm text-slate-600">Current image:</p>
                    <img
                      src={formData.photo_url}
                      alt="Current product"
                      className="mt-1 max-h-32 object-contain border border-slate-200 rounded"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    setFormData({
                      name: '',
                      admin_price: '',
                      profit_amount: '',
                      note: '',
                      photo_url: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
