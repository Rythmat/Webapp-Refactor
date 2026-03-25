import { format } from 'date-fns';
import { Globe, Loader2, Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useCreateFreeAccessRule,
  useDeleteFreeAccessRule,
  useUpdateFreeAccessRule,
  useFreeAccessRules,
  type FreeAccessRule,
} from '@/hooks/data/admin/useAdminFreeAccess';

const DATE_FORMAT = 'MMM d, yyyy';

function typeBadge(type: FreeAccessRule['type']) {
  if (type === 'email') {
    return (
      <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
        <Mail className="mr-1 size-3" />
        Email
      </Badge>
    );
  }
  return (
    <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
      <Globe className="mr-1 size-3" />
      Domain
    </Badge>
  );
}

export const AdminFreeAccessPage = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<FreeAccessRule | null>(null);
  const [newType, setNewType] = useState<'email' | 'domain'>('email');
  const [newValue, setNewValue] = useState('');
  const [newDuration, setNewDuration] = useState<'perpetual' | 'temporary'>(
    'perpetual',
  );
  const [newExpiresAt, setNewExpiresAt] = useState('');

  const [ruleToEdit, setRuleToEdit] = useState<FreeAccessRule | null>(null);
  const [editDuration, setEditDuration] = useState<'perpetual' | 'temporary'>(
    'perpetual',
  );
  const [editExpiresAt, setEditExpiresAt] = useState('');

  const { data: rules = [], isLoading } = useFreeAccessRules();
  const createRule = useCreateFreeAccessRule();
  const updateRule = useUpdateFreeAccessRule();
  const deleteRule = useDeleteFreeAccessRule();

  const handleCreate = async () => {
    if (!newValue.trim()) return;

    await createRule.mutateAsync({
      type: newType,
      value: newValue.trim(),
      duration: newDuration,
      expiresAt: newDuration === 'temporary' ? newExpiresAt : null,
    });
    setNewValue('');
    setNewType('email');
    setNewDuration('perpetual');
    setNewExpiresAt('');
    setIsAddDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!ruleToDelete) return;
    await deleteRule.mutateAsync(ruleToDelete.id);
    setRuleToDelete(null);
  };

  const openEditDialog = (rule: FreeAccessRule) => {
    setRuleToEdit(rule);
    setEditDuration(rule.duration);
    setEditExpiresAt(
      rule.duration === 'temporary' && rule.expiresAt
        ? new Date(rule.expiresAt).toISOString().split('T')[0]
        : '',
    );
  };

  const handleUpdate = async () => {
    if (!ruleToEdit) return;
    await updateRule.mutateAsync({
      id: ruleToEdit.id,
      duration: editDuration,
      expiresAt: editDuration === 'temporary' ? editExpiresAt : null,
    });
    setRuleToEdit(null);
  };

  const emailRules = rules.filter((r) => r.type === 'email');
  const domainRules = rules.filter((r) => r.type === 'domain');

  return (
    <div className="animate-fade-in-bottom space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Insider Access</h1>
          <p className="text-muted-foreground">
            Manage emails and domains that receive insider access without a
            subscription
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add Rule
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-2xl font-bold">{emailRules.length}</div>
          <div className="text-sm text-muted-foreground">
            Email{emailRules.length !== 1 ? 's' : ''} with insider access
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-2xl font-bold">{domainRules.length}</div>
          <div className="text-sm text-muted-foreground">
            Domain{domainRules.length !== 1 ? 's' : ''} with insider access
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No insider access rules configured yet. Add an email or domain to get
          started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{typeBadge(rule.type)}</TableCell>
                <TableCell className="font-mono">{rule.value}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(rule.createdAt), DATE_FORMAT)}
                </TableCell>
                <TableCell>
                  {rule.duration === 'temporary' &&
                  rule.expiresAt &&
                  new Date(rule.expiresAt) < new Date() ? (
                    <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                      Expired
                    </Badge>
                  ) : rule.duration === 'temporary' ? (
                    <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30">
                      Temporary
                    </Badge>
                  ) : (
                    <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                      Perpetual
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {rule.duration === 'temporary' && rule.expiresAt
                    ? format(new Date(rule.expiresAt), DATE_FORMAT)
                    : '\u2014'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(rule)}
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only">Edit duration</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit duration</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            className="text-destructive hover:text-destructive"
                            size="icon"
                            variant="ghost"
                            onClick={() => setRuleToDelete(rule)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete rule</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add Rule Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Insider Access Rule</DialogTitle>
            <DialogDescription>
              Add an email address or domain that will receive insider access
              without needing a subscription. Domain rules apply to all users
              whose email ends with that domain.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as 'email' | 'domain')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email address</SelectItem>
                  <SelectItem value="domain">Domain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{newType === 'email' ? 'Email Address' : 'Domain'}</Label>
              <Input
                placeholder={
                  newType === 'email' ? 'user@example.com' : 'school.edu'
                }
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreate();
                }}
              />
              {newType === 'domain' && (
                <p className="text-xs text-muted-foreground">
                  All users with an email ending in @{newValue || 'domain.com'}{' '}
                  will receive insider access.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={newDuration}
                onValueChange={(v) =>
                  setNewDuration(v as 'perpetual' | 'temporary')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perpetual">Perpetual</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newDuration === 'temporary' && (
              <div className="space-y-2">
                <Label>Expires At</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !newValue.trim() ||
                createRule.isPending ||
                (newDuration === 'temporary' && !newExpiresAt)
              }
              onClick={() => void handleCreate()}
            >
              {createRule.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Rule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Duration Dialog */}
      <Dialog
        open={!!ruleToEdit}
        onOpenChange={(open) => !open && setRuleToEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Duration</DialogTitle>
            <DialogDescription>
              Change the duration of insider access for{' '}
              <span className="font-mono font-semibold">
                {ruleToEdit?.value}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={editDuration}
                onValueChange={(v) =>
                  setEditDuration(v as 'perpetual' | 'temporary')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perpetual">Perpetual</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editDuration === 'temporary' && (
              <div className="space-y-2">
                <Label>Expires At</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleToEdit(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                updateRule.isPending ||
                (editDuration === 'temporary' && !editExpiresAt)
              }
              onClick={() => void handleUpdate()}
            >
              {updateRule.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!ruleToDelete}
        onOpenChange={(open) => !open && setRuleToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove insider access for{' '}
              <span className="font-mono font-semibold">
                {ruleToDelete?.value}
              </span>
              ? Users matching this rule will need a subscription to continue
              accessing the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleToDelete(null)}>
              Cancel
            </Button>
            <Button
              disabled={deleteRule.isPending}
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              {deleteRule.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
