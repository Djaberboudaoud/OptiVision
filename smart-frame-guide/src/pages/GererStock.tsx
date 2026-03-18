import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  fetchGlasses,
  createGlasses,
  updateGlasses,
  deleteGlasses,
  getPhotoUrl,
  type GlassesItem,
} from "@/lib/adminApi";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus, Pencil, Trash2, X, Save, Package, Search,
  Upload, Image as ImageIcon, Box,
} from "lucide-react";

const FRAME_TYPES = ["full-rim", "half-rim", "rimless"];
const FRAME_SHAPES = ["round", "square", "rectangle", "aviator", "cat-eye", "oval"];
const GENDERS = ["male", "female", "unisex"];

const MATERIALS = [
  "Acetate", "TR90", "Polycarbonate", "Stainless Steel", "Titanium",
  "Aluminum", "Wood", "Carbon Fiber", "Memory Metal",
];

const COLORS = [
  "Black", "Brown", "Tortoise", "Gold", "Silver",
  "Rose Gold", "Gunmetal", "Navy Blue", "Burgundy", "Red",
  "White", "Crystal", "Transparent", "Green", "Blue",
  "Pink", "Purple", "Orange", "Yellow", "Grey",
  "Havana", "Champagne", "Bronze", "Ivory", "Matte Black",
];

const emptyForm = {
  glasses_name: "",
  brand: "",
  frame_type: "full-rim",
  frame_shape: "",
  material: "",
  lens_color: "",
  frame_color: "",
  gender: "unisex",
  anti_blue_light: false,
  purchase_price: 0,
  selling_price: 0,
  quantity: 0,
  san_glasses: false,
  anti_fracture: false,
};

export default function GererStock() {
  const { toast } = useToast();
  const [glasses, setGlasses] = useState<GlassesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // File refs
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const data = await fetchGlasses();
      setGlasses(data.glasses);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = glasses.filter((g) =>
    g.glasses_name.toLowerCase().includes(search.toLowerCase()) ||
    (g.brand || "").toLowerCase().includes(search.toLowerCase()) ||
    g.frame_type.toLowerCase().includes(search.toLowerCase())
  );

  const resetFileState = () => {
    setPhotoFile(null);
    setModelFile(null);
    setPhotoPreview(null);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    resetFileState();
    setShowForm(true);
  };

  const openEdit = (g: GlassesItem) => {
    setEditId(g.id);
    setForm({
      glasses_name: g.glasses_name,
      brand: g.brand || "",
      frame_type: g.frame_type,
      frame_shape: g.frame_shape || "",
      material: g.material || "",
      lens_color: g.lens_color || "",
      frame_color: g.frame_color || "",
      gender: g.gender || "unisex",
      anti_blue_light: g.anti_blue_light,
      purchase_price: g.purchase_price,
      selling_price: g.selling_price,
      quantity: g.quantity,
      san_glasses: g.san_glasses,
      anti_fracture: g.anti_fracture,
    });
    resetFileState();
    if (g.image_path) {
      setPhotoPreview(getPhotoUrl(g.image_path));
    }
    setShowForm(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModelFile(file);
    }
  };

  const handleSave = async () => {
    if (!form.glasses_name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await updateGlasses(editId, form, photoFile || undefined, modelFile || undefined);
        toast({ title: "✅ تم التحديث" });
      } else {
        await createGlasses(form, photoFile || undefined, modelFile || undefined);
        toast({ title: "✅ تمت الإضافة" });
      }
      setShowForm(false);
      setEditId(null);
      resetFileState();
      await load();
    } catch (err: any) {
      toast({ title: "❌ خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${name}"؟`)) return;
    try {
      await deleteGlasses(id);
      toast({ title: "🗑️ تم الحذف" });
      await load();
    } catch (err: any) {
      toast({ title: "❌ خطأ", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <style>{`
        .stock-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stock-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .stock-title h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
        }
        .stock-title .count {
          background: rgba(99,102,241,0.15);
          color: #a5b4fc;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
        }
        .stock-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .search-wrap {
          position: relative;
        }
        .search-wrap input {
          padding: 0.6rem 1rem 0.6rem 2.5rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #fff;
          font-size: 0.85rem;
          width: 220px;
          transition: all 0.2s;
        }
        .search-wrap input:focus {
          outline: none;
          border-color: rgba(99,102,241,0.5);
          width: 280px;
        }
        .search-wrap input::placeholder { color: rgba(255,255,255,0.3); }
        .search-wrap svg {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.3);
        }
        .add-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-btn:hover { box-shadow: 0 8px 24px rgba(99,102,241,0.3); transform: translateY(-1px); }

        /* Table */
        .stock-table-wrap {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          overflow-x: auto;
        }
        .stock-table {
          width: 100%;
          min-width: 1100px;
          border-collapse: collapse;
        }
        .stock-table th {
          text-align: left;
          padding: 0.85rem 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .stock-table td {
          padding: 0.85rem 1rem;
          font-size: 0.875rem;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          vertical-align: middle;
        }
        .stock-table tr:hover td {
          background: rgba(255,255,255,0.02);
        }
        .stock-img {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          object-fit: cover;
          background: rgba(255,255,255,0.05);
        }
        .frame-badge {
          display: inline-block;
          padding: 3px 10px;
          background: rgba(99,102,241,0.12);
          color: #a5b4fc;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .gender-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .gender-male { background: rgba(59,130,246,0.12); color: #60a5fa; }
        .gender-female { background: rgba(236,72,153,0.12); color: #f472b6; }
        .gender-unisex { background: rgba(168,85,247,0.12); color: #c084fc; }
        .qty-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .qty-ok { background: rgba(34,197,94,0.12); color: #4ade80; }
        .qty-low { background: rgba(234,179,8,0.12); color: #facc15; }
        .qty-out { background: rgba(239,68,68,0.12); color: #f87171; }
        .blue-light-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          background: rgba(59,130,246,0.12);
          color: #60a5fa;
        }
        .action-btns {
          display: flex;
          gap: 4px;
        }
        .action-btns button {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-edit {
          background: rgba(99,102,241,0.12);
          color: #a5b4fc;
        }
        .btn-edit:hover { background: rgba(99,102,241,0.25); }
        .btn-del {
          background: rgba(239,68,68,0.1);
          color: #f87171;
        }
        .btn-del:hover { background: rgba(239,68,68,0.2); }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1rem;
        }
        .modal-card {
          background: #16163a;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 2rem;
        }
        .modal-card h2 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-card h2 button {
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group.full { grid-column: 1 / -1; }
        .form-group label {
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .form-group input, .form-group select {
          padding: 0.65rem 0.85rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #fff;
          font-size: 0.85rem;
        }
        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: rgba(99,102,241,0.5);
        }
        .form-group select option { background: #16163a; }

        /* Checkbox */
        .checkbox-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 0.85rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          cursor: pointer;
        }
        .checkbox-wrap input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #6366f1;
          cursor: pointer;
        }
        .checkbox-wrap span {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.7);
        }

        /* File upload zone */
        .file-upload-zone {
          border: 2px dashed rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 1.25rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .file-upload-zone:hover {
          border-color: rgba(99,102,241,0.4);
          background: rgba(99,102,241,0.05);
        }
        .file-upload-zone.has-file {
          border-color: rgba(34,197,94,0.3);
          background: rgba(34,197,94,0.05);
        }
        .file-upload-zone .upload-icon {
          color: rgba(255,255,255,0.25);
          margin-bottom: 0.5rem;
        }
        .file-upload-zone .upload-text {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
        }
        .file-upload-zone .upload-text strong {
          color: #a5b4fc;
        }
        .file-upload-zone .file-name {
          font-size: 0.8rem;
          color: #4ade80;
          font-weight: 600;
          margin-top: 4px;
        }
        .file-upload-zone input[type="file"] {
          display: none;
        }
        .photo-preview {
          width: 80px;
          height: 80px;
          border-radius: 10px;
          object-fit: cover;
          margin: 0 auto 0.5rem;
          display: block;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }
        .modal-actions button {
          padding: 0.65rem 1.5rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-cancel {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.6);
        }
        .btn-cancel:hover { background: rgba(255,255,255,0.1); }
        .btn-save {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
        }
        .btn-save:hover { box-shadow: 0 8px 24px rgba(99,102,241,0.3); }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: rgba(255,255,255,0.3);
        }
        .empty-state svg { margin-bottom: 1rem; opacity: 0.3; }

        /* Responsive */
        @media (max-width: 768px) {
          .stock-header { flex-direction: column; align-items: stretch; }
          .stock-actions { flex-direction: column; }
          .search-wrap input { width: 100%; }
          .search-wrap input:focus { width: 100%; }
          .stock-table-wrap { overflow-x: auto; }
          .stock-table { min-width: 900px; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div className="stock-header">
        <div className="stock-title">
          <h1>إدارة المخزون</h1>
          <span className="count">{glasses.length} منتج</span>
        </div>
        <div className="stock-actions">
          <div className="search-wrap">
            <Search className="w-4 h-4" />
            <input
              placeholder="بحث بالاسم، العلامة، النوع..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="add-btn" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            إضافة منتج
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="stock-table-wrap">
        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Package className="w-12 h-12" />
            <p>لا توجد منتجات</p>
          </div>
        ) : (
          <table className="stock-table">
            <thead>
              <tr>
                <th>صورة</th>
                <th>الاسم</th>
                <th>العلامة</th>
                <th>الإطار</th>
                <th>شكل الإطار</th>
                <th>الجنس</th>
                <th>ض. أزرق</th>
                <th>شمسية</th>
                <th>ضد الكسر</th>
                <th>سعر الشراء</th>
                <th>سعر البيع</th>
                <th>الكمية</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id}>
                  <td>
                    {g.image_path ? (
                      <img src={getPhotoUrl(g.image_path)!} alt={g.glasses_name} className="stock-img" />
                    ) : (
                      <div className="stock-img" />
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: "#fff" }}>{g.glasses_name}</td>
                  <td>{g.brand || "—"}</td>
                  <td><span className="frame-badge">{g.frame_type}</span></td>
                  <td><span className="frame-badge">{g.frame_shape || "—"}</span></td>
                  <td>
                    <span className={`gender-badge gender-${g.gender || "unisex"}`}>
                      {g.gender === "male" ? "رجال" : g.gender === "female" ? "نساء" : "الكل"}
                    </span>
                  </td>
                  <td>
                    {g.anti_blue_light && <span className="blue-light-badge">🛡️ نعم</span>}
                  </td>
                  <td>
                    {g.san_glasses && <span className="blue-light-badge">🛡️ نعم</span>}
                  </td>
                  <td>
                    {g.anti_fracture && <span className="blue-light-badge">🛡️ نعم</span>}
                  </td>
                  <td>{g.purchase_price.toLocaleString()} DA</td>
                  <td style={{ fontWeight: 600 }}>{g.selling_price.toLocaleString()} DA</td>
                  <td>
                    <span className={`qty-pill ${g.quantity === 0 ? "qty-out" : g.quantity < 10 ? "qty-low" : "qty-ok"}`}>
                      {g.quantity === 0 ? "نفذ" : g.quantity}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-edit" onClick={() => openEdit(g)} title="تعديل">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="btn-del" onClick={() => handleDelete(g.id, g.glasses_name)} title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal-card">
            <h2>
              {editId ? "تعديل المنتج" : "إضافة منتج جديد"}
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </h2>
            <div className="form-grid">
              {/* Row 1: Name + Brand */}
              <div className="form-group">
                <label>اسم النظارة *</label>
                <input value={form.glasses_name} onChange={(e) => setForm({ ...form, glasses_name: e.target.value })} placeholder="اسم النظارة" />
              </div>
              <div className="form-group">
                <label>العلامة التجارية</label>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="OptiVision" />
              </div>

              {/* Row 2: Frame type + Material */}
              <div className="form-group">
                <label>نوع الإطار *</label>
                <select value={form.frame_type} onChange={(e) => setForm({ ...form, frame_type: e.target.value })}>
                  {FRAME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>شكل الإطار</label>
                <select value={form.frame_shape} onChange={(e) => setForm({ ...form, frame_shape: e.target.value })}>
                  <option value="">— اختر —</option>
                  {FRAME_SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Row 3: Material */}
              <div className="form-group">
                <label>المادة</label>
                <select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })}>
                  <option value="">— اختر —</option>
                  {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Row 3: Lens color + Frame color */}
              <div className="form-group">
                <label>لون العدسة</label>
                <select value={form.lens_color} onChange={(e) => setForm({ ...form, lens_color: e.target.value })}>
                  <option value="">— اختر —</option>
                  {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>لون الإطار</label>
                <select value={form.frame_color} onChange={(e) => setForm({ ...form, frame_color: e.target.value })}>
                  <option value="">— اختر —</option>
                  {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Row 4: Gender + Anti blue light */}
              <div className="form-group">
                <label>الجنس</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  {GENDERS.map((g) => <option key={g} value={g}>{g === "male" ? "رجال" : g === "female" ? "نساء" : "الكل"}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>مضاد الضوء الأزرق</label>
                <label className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={form.anti_blue_light}
                    onChange={(e) => setForm({ ...form, anti_blue_light: e.target.checked })}
                  />
                  <span>{form.anti_blue_light ? "نعم" : "لا"}</span>
                </label>
              </div>
              <div className="form-group">
                <label>عدسات ضد الشمس</label>
                <label className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={form.san_glasses}
                    onChange={(e) => setForm({ ...form, san_glasses: e.target.checked })}
                  />
                  <span>{form.san_glasses ? "نعم" : "لا"}</span>
                </label>
              </div>
              <div className="form-group">
                <label>ضد الكسر</label>
                <label className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={form.anti_fracture}
                    onChange={(e) => setForm({ ...form, anti_fracture: e.target.checked })}
                  />
                  <span>{form.anti_fracture ? "نعم" : "لا"}</span>
                </label>
              </div>

              {/* Row 5: Prices */}
              <div className="form-group">
                <label>سعر الشراء (DA) *</label>
                <input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: +e.target.value })} min={0} />
              </div>
              <div className="form-group">
                <label>سعر البيع (DA) *</label>
                <input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: +e.target.value })} min={0} />
              </div>

              {/* Row 6: Quantity (full width) */}
              <div className="form-group">
                <label>الكمية</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} min={0} />
              </div>

              {/* Spacer */}
              <div></div>

              {/* Row 7: Photo upload */}
              <div className="form-group full">
                <label>اختيار الصورة</label>
                <div
                  className={`file-upload-zone ${photoFile || photoPreview ? "has-file" : ""}`}
                  onClick={() => photoInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="preview" className="photo-preview" />
                  ) : (
                    <ImageIcon className="w-8 h-8 upload-icon" />
                  )}
                  <div className="upload-text">
                    {photoFile ? (
                      <span className="file-name">📷 {photoFile.name}</span>
                    ) : photoPreview ? (
                      <>اضغط لتغيير الصورة</>
                    ) : (
                      <>اضغط لاختيار صورة <strong>(JPG, PNG)</strong></>
                    )}
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>

              {/* Row 8: 3D Model upload */}
              <div className="form-group full">
                <label>اختيار النموذج 3D</label>
                <div
                  className={`file-upload-zone ${modelFile ? "has-file" : ""}`}
                  onClick={() => modelInputRef.current?.click()}
                >
                  <Box className="w-8 h-8 upload-icon" />
                  <div className="upload-text">
                    {modelFile ? (
                      <span className="file-name">📦 {modelFile.name}</span>
                    ) : (
                      <>اضغط لاختيار نموذج <strong>(.glb, .gltf)</strong></>
                    )}
                  </div>
                  <input
                    ref={modelInputRef}
                    type="file"
                    accept=".glb,.gltf"
                    onChange={handleModelChange}
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowForm(false)}>إلغاء</button>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.glasses_name.trim()}>
                <Save className="w-4 h-4" style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                {saving ? "جاري الحفظ..." : editId ? "تحديث" : "إضافة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
