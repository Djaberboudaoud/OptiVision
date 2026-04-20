import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { fetchSavedScans, deleteSavedScan, type SavedScan } from "@/lib/adminApi";
import { useToast } from "@/components/ui/use-toast";
import { BookImage, Trash2, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminSavedScans() {
    const { toast } = useToast();
    const [scans, setScans] = useState<SavedScan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedScan, setSelectedScan] = useState<SavedScan | null>(null);

    const loadScans = () => {
        setLoading(true);
        fetchSavedScans()
            .then(setScans)
            .catch((err) => toast({ title: "Error loading scans", description: err.message, variant: "destructive" }))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadScans();
    }, []);

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this scan?")) return;
        
        try {
            await deleteSavedScan(id);
            toast({ title: "Scan deleted successfully" });
            if (selectedScan?.id === id) setSelectedScan(null);
            loadScans();
        } catch (error) {
            toast({ title: "Failed to delete scan", variant: "destructive" });
        }
    };

    const handleDownload = (photoDataUrl: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const a = document.createElement("a");
        a.href = photoDataUrl;
        a.download = `optivision-scan-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <AdminLayout>
            <style>{`
                .scans-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 2rem;
                }
                .scans-header h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #fff;
                }
                .scans-header .count {
                    background: rgba(99,102,241,0.15);
                    color: #a5b4fc;
                    font-size: 0.8rem;
                    font-weight: 600;
                    padding: 4px 12px;
                    border-radius: 20px;
                }

                .scans-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 1.5rem;
                }

                .scan-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 16px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                }
                .scan-card:hover {
                    border-color: rgba(99,102,241,0.5);
                    transform: translateY(-2px);
                }
                .scan-card.active {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 1px #6366f1;
                }

                .scan-image-container {
                    width: 100%;
                    aspect-ratio: 1;
                    background: #000;
                    position: relative;
                    overflow: hidden;
                }
                .scan-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .scan-date {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 2rem 1rem 0.75rem;
                    background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
                    color: rgba(255,255,255,0.8);
                    font-size: 0.75rem;
                }

                .scan-info {
                    padding: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }
                .scan-shape {
                    font-weight: 600;
                    color: #fff;
                    font-size: 0.95rem;
                    text-transform: capitalize;
                }
                .scan-mbs {
                    font-size: 0.8rem;
                    color: rgba(255,255,255,0.5);
                    margin-top: 2px;
                }
                
                .scan-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                .action-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255,255,255,0.05);
                    color: rgba(255,255,255,0.6);
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .action-btn:hover {
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                }
                .action-btn.delete:hover {
                    background: rgba(239,68,68,0.2);
                    color: #ef4444;
                }

                .empty-state {
                    text-align: center;
                    padding: 6rem 2rem;
                    color: rgba(255,255,255,0.3);
                    background: rgba(255,255,255,0.02);
                    border-radius: 24px;
                    border: 1px dashed rgba(255,255,255,0.1);
                }
                .empty-state svg {
                    margin: 0 auto 1rem;
                    opacity: 0.5;
                }

                /* Layout with sidebar details */
                .scans-layout {
                    display: flex;
                    gap: 2rem;
                    align-items: flex-start;
                }
                .scans-main {
                    flex: 1;
                }
                .scan-details-panel {
                    width: 340px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 20px;
                    padding: 1.5rem;
                    position: sticky;
                    top: 2rem;
                }
                .details-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #fff;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }
                .metric-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                }
                .metric-label {
                    color: rgba(255,255,255,0.5);
                    font-size: 0.85rem;
                }
                .metric-value {
                    color: #fff;
                    font-weight: 500;
                    font-size: 0.9rem;
                }
                .metric-value.highlight {
                    color: #4ade80;
                    font-weight: 600;
                }

                @media (max-width: 1024px) {
                    .scans-layout {
                        flex-direction: column;
                    }
                    .scan-details-panel {
                        width: 100%;
                        position: static;
                    }
                }
            `}</style>

            <div className="scans-header">
                <h1>Face Scans</h1>
                <span className="count">{scans.length} scans</span>
            </div>

            {loading ? (
                <div className="empty-state">Loading scans...</div>
            ) : scans.length === 0 ? (
                <div className="empty-state">
                    <BookImage className="w-16 h-16" />
                    <h2>No saved scans yet</h2>
                    <p style={{ marginTop: 8 }}>User face scans will appear here.</p>
                </div>
            ) : (
                <div className="scans-layout">
                    <div className="scans-main">
                        <div className="scans-grid">
                            {scans.map(scan => (
                                <div 
                                    key={scan.id} 
                                    className={`scan-card ${selectedScan?.id === scan.id ? 'active' : ''}`}
                                    onClick={() => setSelectedScan(scan)}
                                >
                                    <div className="scan-image-container">
                                        <img src={scan.photo_data_url} alt="Face Scan" className="scan-image" />
                                        <div className="scan-date">
                                            {new Date(scan.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="scan-info">
                                        <div>
                                            <div className="scan-shape">{scan.face_shape}</div>
                                            <div className="scan-mbs">MBS: {scan.mbs} mm</div>
                                        </div>
                                        <div className="scan-actions">
                                            <button 
                                                className="action-btn" 
                                                onClick={(e) => handleDownload(scan.photo_data_url, e)}
                                                title="Download Photo"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button 
                                                className="action-btn delete" 
                                                onClick={(e) => handleDelete(scan.id, e)}
                                                title="Delete Scan"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedScan && (
                        <div className="scan-details-panel">
                            <h2 className="details-title">Detailed Analysis</h2>
                            
                            <div className="metric-row">
                                <span className="metric-label">Face Shape</span>
                                <span className="metric-value" style={{ textTransform: 'capitalize' }}>{selectedScan.face_shape}</span>
                            </div>
                            
                            <div className="metric-row">
                                <span className="metric-label">Confidence</span>
                                <span className="metric-value">{(selectedScan.confidence * 100).toFixed(1)}%</span>
                            </div>
                            
                            <div className="metric-row">
                                <span className="metric-label">Minimum Blank Size (MBS)</span>
                                <span className="metric-value highlight">{selectedScan.mbs.toFixed(1)} mm</span>
                            </div>
                            
                            <div className="metric-row">
                                <span className="metric-label">Pupillary Distance (PD)</span>
                                <span className="metric-value">{selectedScan.pupillary_distance.toFixed(1)} mm</span>
                            </div>
                            
                            <div className="metric-row">
                                <span className="metric-label">Face Width</span>
                                <span className="metric-value">{selectedScan.face_width.toFixed(1)} mm</span>
                            </div>
                            
                            <div className="metric-row">
                                <span className="metric-label">Face Height</span>
                                <span className="metric-value">{selectedScan.face_height.toFixed(1)} mm</span>
                            </div>

                            <div style={{ marginTop: '2rem' }}>
                                <Button 
                                    className="w-full gap-2" 
                                    variant="outline"
                                    onClick={(e) => handleDownload(selectedScan.photo_data_url, e as any)}
                                >
                                    <Download className="w-4 h-4" />
                                    Download Image
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </AdminLayout>
    );
}
