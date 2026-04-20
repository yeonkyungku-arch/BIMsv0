'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { mockWarehouses, mockPartners, mockReceivingRecords, mockOutgoingRecords, mockTransferRecords, ASSET_TYPE_META, RECEIVING_STATUS_META, OUTGOING_STATUS_META, TRANSFER_STATUS_META } from '@/lib/mock-data';
import { PageHeader } from '@/components/page-header';
import { useRBAC } from '@/contexts/rbac-context';
import { AccessDenied } from '@/components/access-denied';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, Warehouse, Building2, CheckCircle2, AlertTriangle, Package, Truck, ArrowRight, ArrowLeftRight, Clock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── 상태 카드 컴포넌트 ──────────────────────────────────────────────────────

function StatusCard({
  label, count, isSelected, onClick, icon: Icon,
}: {
  label: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
  icon: React.ElementType;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-sm',
        isSelected && 'ring-2 ring-primary ring-offset-1',
        count === 0 && 'opacity-50',
      )}
      onClick={onClick}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-full p-2', isSelected ? 'bg-primary/10' : 'bg-muted')}>
            <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{count}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WarehouseManagementPage() {
  const { userActions } = useRBAC();
  const canView = userActions.includes('registry.device.read');

  // 권한 체크
  if (!canView) return <AccessDenied />;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // 다이얼로그 상태
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailWarehouse, setDetailWarehouse] = useState<any | null>(null);

  // 추가 폼 상태
  const [addForm, setAddForm] = useState({
    partnerId: '',
    name: '',
    address: '',
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    isActive: true,
  });

  // 수정 폼 상태
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    isActive: true,
  });

  const resetAddForm = () => setAddForm({ partnerId: '', name: '', address: '', managerName: '', managerPhone: '', managerEmail: '', isActive: true });

  // 창고 상세 보기
  const handleViewDetail = (warehouse: any) => {
    setDetailWarehouse(warehouse);
    setDetailDrawerOpen(true);
  };

  // 창고별 재고 현황 계산 (입고 - 출고 + 전입 - 전출)
  const getWarehouseInventory = (warehouseId: string) => {
    const inventory: Record<string, { received: number; shipped: number; transferIn: number; transferOut: number; inStock: number }> = {};
    
    // 입고 수량 집계 (검수 완료 상태만)
    mockReceivingRecords
      .filter(r => r.warehouseId === warehouseId && (r.status === 'passed' || r.status === 'partial'))
      .forEach(r => {
        r.items.forEach(item => {
          if (!inventory[item.assetSubType]) inventory[item.assetSubType] = { received: 0, shipped: 0, transferIn: 0, transferOut: 0, inStock: 0 };
          inventory[item.assetSubType].received += item.passedQuantity || 0;
        });
      });
    
    // 출고 수량 집계 (설치 완료 건만)
    mockOutgoingRecords
      .filter(r => r.warehouseId === warehouseId && r.status === 'installed')
      .forEach(r => {
        r.items.forEach(item => {
          if (!inventory[item.assetSubType]) inventory[item.assetSubType] = { received: 0, shipped: 0, transferIn: 0, transferOut: 0, inStock: 0 };
          inventory[item.assetSubType].shipped += 1;
        });
      });
    
    // 전입 수량 집계 (완료된 전입)
    mockTransferRecords
      .filter(r => r.toWarehouseId === warehouseId && r.status === 'completed')
      .forEach(r => {
        r.items.forEach(item => {
          if (!inventory[item.assetSubType]) inventory[item.assetSubType] = { received: 0, shipped: 0, transferIn: 0, transferOut: 0, inStock: 0 };
          inventory[item.assetSubType].transferIn += 1;
        });
      });
    
    // 전출 수량 집계 (완료된 전출)
    mockTransferRecords
      .filter(r => r.fromWarehouseId === warehouseId && r.status === 'completed')
      .forEach(r => {
        r.items.forEach(item => {
          if (!inventory[item.assetSubType]) inventory[item.assetSubType] = { received: 0, shipped: 0, transferIn: 0, transferOut: 0, inStock: 0 };
          inventory[item.assetSubType].transferOut += 1;
        });
      });
    
    // 재고 계산 (입고 + 전입 - 출고 - 전출)
    Object.keys(inventory).forEach(key => {
      inventory[key].inStock = inventory[key].received + inventory[key].transferIn - inventory[key].shipped - inventory[key].transferOut;
    });
    
    return inventory;
  };

  // 창고별 입고 이력 (전체)
  const getWarehouseReceiving = (warehouseId: string) => {
    return mockReceivingRecords.filter(r => r.warehouseId === warehouseId);
  };

  // 창고별 출고 목록 (전체 - 예정 및 완료 포함)
  const getWarehouseOutgoing = (warehouseId: string) => {
    return mockOutgoingRecords.filter(r => r.warehouseId === warehouseId);
  };

  // 창고별 전출/전입 이력
  const getWarehouseTransfers = (warehouseId: string) => {
    return mockTransferRecords.filter(r => r.fromWarehouseId === warehouseId || r.toWarehouseId === warehouseId);
  };

  // 핸들러
  const handleAddSubmit = () => {
    // TODO: API 연동 시 여기서 등록 요청
    setAddDialogOpen(false);
    resetAddForm();
  };

  const handleEdit = (warehouse: any) => {
    setSelectedWarehouse(warehouse);
    setEditForm({
      name: warehouse.name,
      address: warehouse.address,
      managerName: warehouse.managerName,
      managerPhone: warehouse.managerPhone,
      managerEmail: warehouse.managerEmail,
      isActive: warehouse.isActive,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (warehouse: any) => {
    setSelectedWarehouse(warehouse);
    setDeleteDialogOpen(true);
  };

  const handleEditSubmit = () => {
    // TODO: API 연동 시 여기서 수정 요청
    setEditDialogOpen(false);
    setSelectedWarehouse(null);
  };

  const handleDeleteConfirm = () => {
    // TODO: API 연동 시 여기서 삭제 요청
    setDeleteDialogOpen(false);
    setSelectedWarehouse(null);
  };

  // 통계 계산
  const stats = useMemo(() => ({
    total: mockWarehouses.length,
    active: mockWarehouses.filter((w) => w.isActive).length,
    inactive: mockWarehouses.filter((w) => !w.isActive).length,
    partners: new Set(mockWarehouses.map((w) => w.partnerId)).size,
  }), []);

  const filteredWarehouses = useMemo(() => {
    return mockWarehouses.filter((warehouse) => {
      const matchesSearch =
        warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warehouse.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warehouse.managerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPartner = selectedPartnerId === 'all' || warehouse.partnerId === selectedPartnerId;
      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'active' && warehouse.isActive) ||
        (selectedStatus === 'inactive' && !warehouse.isActive);
      return matchesSearch && matchesPartner && matchesStatus;
    });
  }, [searchTerm, selectedPartnerId, selectedStatus]);

  const partnerOptions = mockPartners.filter((p) =>
    mockWarehouses.some((w) => w.partnerId === p.id)
  );

  const getPartnerName = (partnerId: string): string => {
    return mockPartners.find((p) => p.id === partnerId)?.companyName || partnerId;
  };

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <PageHeader
        title="창고 관리"
        description="파트너사의 창고 정보를 관리합니다."
        actions={
          <Button size="sm" className="gap-2" onClick={() => { resetAddForm(); setAddDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            창고 추가
          </Button>
        }
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusCard
          label="전체 창고"
          count={stats.total}
          isSelected={selectedStatus === 'all'}
          onClick={() => setSelectedStatus('all')}
          icon={Warehouse}
        />
        <StatusCard
          label="활성 창고"
          count={stats.active}
          isSelected={selectedStatus === 'active'}
          onClick={() => setSelectedStatus('active')}
          icon={CheckCircle2}
        />
        <StatusCard
          label="비활성 창고"
          count={stats.inactive}
          isSelected={selectedStatus === 'inactive'}
          onClick={() => setSelectedStatus('inactive')}
          icon={Warehouse}
        />
        <StatusCard
          label="파트너사"
          count={stats.partners}
          isSelected={false}
          onClick={() => {}}
          icon={Building2}
        />
      </div>

      {/* 필터 */}
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="창고명, 주소, 담당자 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="파트너사" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">파트너사 전체</SelectItem>
            {partnerOptions.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                {partner.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="active">활성</SelectItem>
            <SelectItem value="inactive">비활성</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground px-2">
          결과: {filteredWarehouses.length}건
        </div>
      </div>

      {/* 창고 카드 뷰 */}
      {filteredWarehouses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            창고가 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarehouses.map((warehouse) => (
            <Card key={warehouse.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{getPartnerName(warehouse.partnerId)}</p>
                  </div>
                  <Badge variant={warehouse.isActive ? 'default' : 'secondary'}>
                    {warehouse.isActive ? '활성' : '비활성'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 위치 */}
                <div className="flex gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-muted-foreground truncate">{warehouse.address}</div>
                </div>

                {/* 담당자 */}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-foreground">담당자: {warehouse.managerName}</div>
                  <div className="flex gap-3 text-xs">
                    <a href={`tel:${warehouse.managerPhone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                      <Phone className="h-3 w-3" />
                      {warehouse.managerPhone}
                    </a>
                    <a href={`mailto:${warehouse.managerEmail}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                      <Mail className="h-3 w-3" />
                      이메일
                    </a>
                  </div>
                </div>

                {/* 등록일 */}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>등록일: {warehouse.createdAt}</span>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1 gap-1"
                    onClick={() => handleViewDetail(warehouse)}
                  >
                    <Eye className="h-3 w-3" />
                    상세
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1"
                    onClick={() => handleEdit(warehouse)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(warehouse)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── 창고 추가 다이얼로그 ─────────────────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>창고 추가</DialogTitle>
            <DialogDescription>새 창고를 등록합니다. 파트너사를 선택하고 창고 정보를 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-partner">파트너사 <span className="text-destructive">*</span></Label>
              <Select value={addForm.partnerId} onValueChange={(v) => setAddForm({ ...addForm, partnerId: v })}>
                <SelectTrigger id="add-partner">
                  <SelectValue placeholder="파트너사 선택" />
                </SelectTrigger>
                <SelectContent>
                  {mockPartners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-name">창고명 <span className="text-destructive">*</span></Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="예: 서울 본사 창고"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-address">주소 <span className="text-destructive">*</span></Label>
              <Input
                id="add-address"
                value={addForm.address}
                onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                placeholder="예: 서울특별시 강남구 테헤란로 123"
              />
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">담당자 정보</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="add-manager">담당자명 <span className="text-destructive">*</span></Label>
                  <Input
                    id="add-manager"
                    value={addForm.managerName}
                    onChange={(e) => setAddForm({ ...addForm, managerName: e.target.value })}
                    placeholder="홍길동"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-phone">연락처 <span className="text-destructive">*</span></Label>
                  <Input
                    id="add-phone"
                    value={addForm.managerPhone}
                    onChange={(e) => setAddForm({ ...addForm, managerPhone: e.target.value })}
                    placeholder="02-1234-5678"
                  />
                </div>
              </div>
              <div className="space-y-2 mt-3">
                <Label htmlFor="add-email">이메일</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={addForm.managerEmail}
                  onChange={(e) => setAddForm({ ...addForm, managerEmail: e.target.value })}
                  placeholder="warehouse@company.co.kr"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="add-active">활성 상태</Label>
                <p className="text-xs text-muted-foreground">비활성 시 입출고가 제한됩니다.</p>
              </div>
              <Switch
                id="add-active"
                checked={addForm.isActive}
                onCheckedChange={(checked) => setAddForm({ ...addForm, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetAddForm(); }}>취소</Button>
            <Button
              onClick={handleAddSubmit}
              disabled={!addForm.partnerId || !addForm.name || !addForm.address || !addForm.managerName || !addForm.managerPhone}
            >
              <Plus className="h-4 w-4 mr-1" />
              창고 추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 수정 다이얼로그 ─────────────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>창고 수정</DialogTitle>
            <DialogDescription>창고 정보를 수정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">창고명</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="창고명 입력"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">주소</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="주소 입력"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-manager">담당자명</Label>
                <Input
                  id="edit-manager"
                  value={editForm.managerName}
                  onChange={(e) => setEditForm({ ...editForm, managerName: e.target.value })}
                  placeholder="담당자명"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">연락처</Label>
                <Input
                  id="edit-phone"
                  value={editForm.managerPhone}
                  onChange={(e) => setEditForm({ ...editForm, managerPhone: e.target.value })}
                  placeholder="연락처"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">이메일</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.managerEmail}
                onChange={(e) => setEditForm({ ...editForm, managerEmail: e.target.value })}
                placeholder="이메일"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="edit-active">활성 상태</Label>
                <p className="text-xs text-muted-foreground">비활성 시 입출고가 제한됩니다.</p>
              </div>
              <Switch
                id="edit-active"
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>취소</Button>
            <Button onClick={handleEditSubmit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 삭제 확인 다이얼로그 ───────────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              창고 삭제
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{selectedWarehouse?.name}</span> 창고를 삭제하시겠습니까?
              <br />
              <span className="text-destructive">이 작업은 되돌릴 수 없으며, 관련된 재고 데이터에 영향을 줄 수 있습니다.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── 창고 상세 정보 Drawer ─────────────────────────────────────────────── */}
      <Sheet open={detailDrawerOpen} onOpenChange={setDetailDrawerOpen}>
        <SheetContent side="right" className="w-full md:max-w-2xl overflow-y-auto">
          {detailWarehouse && (() => {
            const inventory = getWarehouseInventory(detailWarehouse.id);
            const receivingHistory = getWarehouseReceiving(detailWarehouse.id);
            const outgoingSchedule = getWarehouseOutgoing(detailWarehouse.id);
            const totalStock = Object.values(inventory).reduce((sum, v) => sum + v.inStock, 0);
            const totalReceived = Object.values(inventory).reduce((sum, v) => sum + v.received, 0);
            const totalShipped = Object.values(inventory).reduce((sum, v) => sum + v.shipped, 0);

            const transferHistory = getWarehouseTransfers(detailWarehouse.id);
            const totalTransferIn = Object.values(inventory).reduce((sum, v) => sum + v.transferIn, 0);
            const totalTransferOut = Object.values(inventory).reduce((sum, v) => sum + v.transferOut, 0);
            const pendingOutgoing = outgoingSchedule.filter(o => o.status !== 'installed').length;
            const pendingTransfer = transferHistory.filter(t => t.status === 'pending_approval' || t.status === 'in_transit').length;

            return (
              <>
                <SheetHeader className="pb-4 border-b">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-primary" />
                    <Badge variant={detailWarehouse.isActive ? 'default' : 'secondary'}>
                      {detailWarehouse.isActive ? '활성' : '비활성'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{detailWarehouse.id}</Badge>
                  </div>
                  <SheetTitle className="text-xl">{detailWarehouse.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3.5 w-3.5" /> {detailWarehouse.address}
                  </SheetDescription>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>소속: {detailWarehouse.partnerName}</span>
                  </div>
                </SheetHeader>

                <div className="py-4 space-y-6">
                  {/* 요약 카드 - 5개 */}
                  <div className="grid grid-cols-5 gap-2">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="py-2 px-3 text-center">
                        <p className="text-xl font-bold text-blue-700">{totalStock}</p>
                        <p className="text-[10px] text-blue-600">현재 재고</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-200">
                      <CardContent className="py-2 px-3 text-center">
                        <p className="text-xl font-bold text-emerald-700">{totalReceived}</p>
                        <p className="text-[10px] text-emerald-600">총 입고</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-amber-50 border-amber-200">
                      <CardContent className="py-2 px-3 text-center">
                        <p className="text-xl font-bold text-amber-700">{totalShipped}</p>
                        <p className="text-[10px] text-amber-600">총 출고</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-indigo-50 border-indigo-200">
                      <CardContent className="py-2 px-3 text-center">
                        <p className="text-xl font-bold text-indigo-700">+{totalTransferIn}</p>
                        <p className="text-[10px] text-indigo-600">전입</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-rose-50 border-rose-200">
                      <CardContent className="py-2 px-3 text-center">
                        <p className="text-xl font-bold text-rose-700">-{totalTransferOut}</p>
                        <p className="text-[10px] text-rose-600">전출</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 대기 중인 건 알림 */}
                  {(pendingOutgoing > 0 || pendingTransfer > 0) && (
                    <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-900">
                          <p className="font-semibold">진행 중인 작업</p>
                          <p className="text-xs">출고 대기: {pendingOutgoing}건 | 전출/전입 대기: {pendingTransfer}건</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Tabs defaultValue="inventory" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="inventory" className="text-[10px] gap-1"><Package className="h-3 w-3" /> 재고</TabsTrigger>
                      <TabsTrigger value="receiving" className="text-[10px] gap-1"><Truck className="h-3 w-3" /> 입고 ({receivingHistory.length})</TabsTrigger>
                      <TabsTrigger value="outgoing" className="text-[10px] gap-1"><ArrowRight className="h-3 w-3" /> 출고 ({outgoingSchedule.length})</TabsTrigger>
                      <TabsTrigger value="transfer" className="text-[10px] gap-1"><ArrowLeftRight className="h-3 w-3" /> 전출입 ({transferHistory.length})</TabsTrigger>
                    </TabsList>

                    {/* 재고 현황 */}
                    <TabsContent value="inventory" className="mt-4">
                      {Object.keys(inventory).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">재고 데이터가 없습니다.</p>
                      ) : (
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs font-semibold">품목</TableHead>
                                <TableHead className="text-xs font-semibold w-14 text-right">입고</TableHead>
                                <TableHead className="text-xs font-semibold w-14 text-right">전입</TableHead>
                                <TableHead className="text-xs font-semibold w-14 text-right">출고</TableHead>
                                <TableHead className="text-xs font-semibold w-14 text-right">전출</TableHead>
                                <TableHead className="text-xs font-semibold w-14 text-right">재고</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(inventory).map(([type, data]) => (
                                <TableRow key={type}>
                                  <TableCell className="text-xs">
                                    {ASSET_TYPE_META[type as keyof typeof ASSET_TYPE_META]?.label || type}
                                  </TableCell>
                                  <TableCell className="text-xs text-right tabular-nums text-emerald-600">+{data.received}</TableCell>
                                  <TableCell className="text-xs text-right tabular-nums text-indigo-600">+{data.transferIn}</TableCell>
                                  <TableCell className="text-xs text-right tabular-nums text-amber-600">-{data.shipped}</TableCell>
                                  <TableCell className="text-xs text-right tabular-nums text-rose-600">-{data.transferOut}</TableCell>
                                  <TableCell className="text-xs text-right tabular-nums font-bold">{data.inStock}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/30 font-semibold">
                                <TableCell className="text-xs">합계</TableCell>
                                <TableCell className="text-xs text-right tabular-nums text-emerald-600">+{totalReceived}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums text-indigo-600">+{totalTransferIn}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums text-amber-600">-{totalShipped}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums text-rose-600">-{totalTransferOut}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums font-bold">{totalStock}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>

                    {/* 입고 이력 */}
                    <TabsContent value="receiving" className="mt-4">
                      {receivingHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">입고 이력이 없습니다.</p>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {receivingHistory.map((rec) => (
                            <Card key={rec.id} className="border">
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-mono text-[10px] text-muted-foreground">{rec.id}</p>
                                    <p className="text-sm font-medium">{rec.supplierName}</p>
                                    <p className="text-[10px] text-muted-foreground">수령자: {rec.receivedBy} | 검수자: {rec.inspectedBy}</p>
                                  </div>
                                  <Badge className={cn("text-[10px]", RECEIVING_STATUS_META[rec.status as keyof typeof RECEIVING_STATUS_META]?.color)}>
                                    {RECEIVING_STATUS_META[rec.status as keyof typeof RECEIVING_STATUS_META]?.label}
                                  </Badge>
                                </div>
                                <Separator />
                                <div className="flex flex-wrap gap-1.5">
                                  {rec.items.map((item, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px]">
                                      {ASSET_TYPE_META[item.assetSubType as keyof typeof ASSET_TYPE_META]?.label || item.assetSubType} 
                                      <span className="ml-1 text-emerald-600">x{item.passedQuantity || 0}</span>
                                      {item.failedQuantity > 0 && <span className="ml-0.5 text-red-500">({item.failedQuantity} 불량)</span>}
                                    </Badge>
                                  ))}
                                </div>
                                {rec.inspectionNotes && (
                                  <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">{rec.inspectionNotes}</p>
                                )}
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                  <span>입고일: {rec.receivedDate}</span>
                                  <span>검수: {rec.inspectedAt}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* 출고 이력 */}
                    <TabsContent value="outgoing" className="mt-4">
                      {outgoingSchedule.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">출고 이력이 없습니다.</p>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {outgoingSchedule.map((out) => (
                            <Card key={out.id} className="border">
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-mono text-[10px] text-muted-foreground">{out.id}</p>
                                    <p className="text-sm font-medium">{out.customerName}</p>
                                    <p className="text-xs text-muted-foreground">{out.stopName}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <Badge className={cn("text-[10px]", OUTGOING_STATUS_META[out.status as keyof typeof OUTGOING_STATUS_META]?.color)}>
                                      {OUTGOING_STATUS_META[out.status as keyof typeof OUTGOING_STATUS_META]?.label}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px]">{out.ownershipType === 'rental' ? '임대' : '판매'}</Badge>
                                  </div>
                                </div>
                                <Separator />
                                <div className="flex flex-wrap gap-1.5">
                                  {out.items.map((item, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px] font-mono">
                                      {item.assetCode}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                                  <span>예정일: {out.scheduledDate}</span>
                                  {out.installedDate && <span>설치일: {out.installedDate}</span>}
                                  {out.installedBy && <span>설치자: {out.installedBy}</span>}
                                  {out.approvedBy && <span>승인: {out.approvedBy}</span>}
                                </div>
                                {out.notes && (
                                  <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">{out.notes}</p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* 전출/전입 이력 */}
                    <TabsContent value="transfer" className="mt-4">
                      {transferHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">전출/전입 이력이 없습니다.</p>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {transferHistory.map((trf) => {
                            const isIncoming = trf.toWarehouseId === detailWarehouse.id;
                            return (
                              <Card key={trf.id} className={cn("border", isIncoming ? "border-l-4 border-l-indigo-500" : "border-l-4 border-l-rose-500")}>
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={isIncoming ? "default" : "secondary"} className="text-[10px]">
                                          {isIncoming ? "전입" : "전출"}
                                        </Badge>
                                        <p className="font-mono text-[10px] text-muted-foreground">{trf.id}</p>
                                      </div>
                                      <p className="text-sm font-medium mt-1">
                                        {isIncoming ? trf.fromWarehouseName : trf.toWarehouseName}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {isIncoming ? `${trf.fromPartnerName}` : `${trf.toPartnerName}`}
                                      </p>
                                    </div>
                                    <Badge className={cn("text-[10px]", TRANSFER_STATUS_META[trf.status as keyof typeof TRANSFER_STATUS_META]?.color)}>
                                      {TRANSFER_STATUS_META[trf.status as keyof typeof TRANSFER_STATUS_META]?.label}
                                    </Badge>
                                  </div>
                                  <Separator />
                                  <div className="flex flex-wrap gap-1.5">
                                    {trf.items.map((item, i) => (
                                      <Badge key={i} variant="outline" className="text-[10px] font-mono">
                                        {item.assetCode}
                                      </Badge>
                                    ))}
                                  </div>
                                  {trf.reason && (
                                    <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">사유: {trf.reason}</p>
                                  )}
                                  <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                                    <span>예정일: {trf.scheduledDate}</span>
                                    {trf.completedDate && <span>완료일: {trf.completedDate}</span>}
                                    {trf.transferredBy && <span>담당자: {trf.transferredBy}</span>}
                                    {trf.approvedBy && <span>승인: {trf.approvedBy}</span>}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  <Separator />

                  {/* 담당자 정보 */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">담당자 정보</h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">담당자:</span>
                        <span className="font-medium">{detailWarehouse.managerName}</span>
                      </div>
                      <a href={`tel:${detailWarehouse.managerPhone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                        <Phone className="h-3.5 w-3.5" /> {detailWarehouse.managerPhone}
                      </a>
                      <a href={`mailto:${detailWarehouse.managerEmail}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                        <Mail className="h-3.5 w-3.5" /> {detailWarehouse.managerEmail}
                      </a>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
