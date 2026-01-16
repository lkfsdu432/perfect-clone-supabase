import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Check,
  X,
  Clock,
  Eye,
  CreditCard,
  Loader2,
  Phone,
  User,
  Hash,
  RefreshCw,
} from "lucide-react";
import { fetchRecharges, updateRecharge, updateToken, adminAction } from "@/lib/adminApi";
import { toast } from "sonner";

interface RechargeRequest {
  id: string;
  token_id: string;
  amount: number;
  payment_method: string | null;
  proof_image_url: string | null;
  payment_proof_url: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  transaction_reference: string | null;
  sender_reference: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  token_value?: string;
  token_balance?: number;
}

export const RechargeManagement = () => {
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RechargeRequest | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const result = await fetchRecharges();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      let recharges = result.data?.recharges || [];
      
      // Filter by status if needed
      if (filter !== 'all') {
        recharges = recharges.filter((r: any) => r.status === filter);
      }

      setRequests(recharges as RechargeRequest[]);
    } catch (error) {
      console.error('Error fetching recharge requests:', error);
      toast.error("خطأ في جلب طلبات الشحن");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleAction = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      if (actionType === 'approve') {
        // Update token balance via admin API
        const currentBalance = selectedRequest.token_balance || 0;
        const newBalance = currentBalance + selectedRequest.amount;

        const tokenResult = await updateToken(selectedRequest.token_id, { balance: newBalance });
        if (!tokenResult.success) throw new Error(tokenResult.error);
      }

      // Update request status via admin API
      const rechargeResult = await updateRecharge(selectedRequest.id, {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        admin_note: adminNote || null,
        processed_at: new Date().toISOString(),
      });

      if (!rechargeResult.success) throw new Error(rechargeResult.error);

      toast.success(
        actionType === 'approve'
          ? `تم الموافقة وإضافة ${selectedRequest.amount} للرصيد`
          : "تم رفض الطلب"
      );

      setShowActionModal(false);
      setSelectedRequest(null);
      setAdminNote("");
      fetchRequests();
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error("حدث خطأ أثناء معالجة الطلب");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> قيد المراجعة</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><Check className="w-3 h-3 mr-1" /> موافق عليه</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><X className="w-3 h-3 mr-1" /> مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProofImage = (request: RechargeRequest) => {
    return request.proof_image_url || request.payment_proof_url;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          طلبات الشحن
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 rounded-md border bg-background text-sm"
          >
            <option value="pending">قيد المراجعة</option>
            <option value="approved">موافق عليه</option>
            <option value="rejected">مرفوض</option>
            <option value="all">الكل</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            لا توجد طلبات شحن {filter === 'pending' ? 'قيد المراجعة' : ''}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Proof Image Thumbnail */}
                  {getProofImage(request) && (
                    <div
                      className="w-24 h-24 rounded-lg overflow-hidden cursor-pointer border flex-shrink-0"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowImageModal(true);
                      }}
                    >
                      <img
                        src={getProofImage(request)!}
                        alt="Proof"
                        className="w-full h-full object-cover hover:scale-110 transition-transform"
                      />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          ${request.amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <span>التوكن:</span>
                          <span className="font-mono" dir="ltr">{request.token_value || request.token_id?.substring(0, 8)}</span>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {request.sender_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {request.sender_name}
                        </span>
                      )}
                      {request.sender_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {request.sender_phone}
                        </span>
                      )}
                      {request.transaction_reference && (
                        <span className="flex items-center gap-1">
                          <Hash className="w-4 h-4" />
                          {request.transaction_reference}
                        </span>
                      )}
                      {request.sender_reference && (
                        <span className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded text-primary font-medium">
                          <Hash className="w-4 h-4" />
                          المحول: {request.sender_reference}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {formatDate(request.created_at)}
                    </div>

                    {request.admin_note && (
                      <div className="text-sm bg-muted/50 p-2 rounded">
                        <span className="font-medium">ملاحظة الأدمن:</span> {request.admin_note}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {request.status === 'pending' && (
                    <div className="flex md:flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                        onClick={() => {
                          setSelectedRequest(request);
                          setActionType('approve');
                          setShowActionModal(true);
                        }}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        موافقة
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => {
                          setSelectedRequest(request);
                          setActionType('reject');
                          setShowActionModal(true);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        رفض
                      </Button>
                      {getProofImage(request) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowImageModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          الصورة
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>صورة إثبات التحويل</DialogTitle>
          </DialogHeader>
          {selectedRequest && getProofImage(selectedRequest) && (
            <img
              src={getProofImage(selectedRequest)!}
              alt="Payment Proof"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Action Modal */}
      <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {actionType === 'approve' ? (
              <p>
                سيتم إضافة <strong>${selectedRequest?.amount.toFixed(2)}</strong> لرصيد التوكن
              </p>
            ) : (
              <p>سيتم رفض هذا الطلب ولن يتم إضافة أي رصيد</p>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظة (اختياري)</label>
              <Textarea
                placeholder="أضف ملاحظة للعميل..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionModal(false)}>
              إلغاء
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : actionType === 'approve' ? (
                'تأكيد الموافقة'
              ) : (
                'تأكيد الرفض'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RechargeManagement;
