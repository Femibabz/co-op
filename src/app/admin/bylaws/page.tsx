'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Eye, FileText } from 'lucide-react';
import { db } from '@/lib/mock-data';
import { ByLaw } from '@/types';

export default function AdminByLawsPage() {
  const { user } = useAuth();
  const [byLaws, setByLaws] = useState<ByLaw[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedByLaw, setSelectedByLaw] = useState<ByLaw | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as 'membership' | 'financial' | 'governance' | 'general',
    isActive: true,
  });

  useEffect(() => {
    loadByLaws();
  }, []);

  const loadByLaws = async () => {
    if (!user?.societyId) return;
    const allByLaws = await db.getByLaws(user.societyId);
    setByLaws(allByLaws);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: name === 'isActive' ? value === 'true' : value
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      isActive: true,
    });
    setError('');
    setSuccess('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (!formData.title.trim() || !formData.content.trim()) {
        setError('Please fill in all required fields');
        return;
      }

      if (!user) {
        setError('User not authenticated');
        return;
      }

      const newByLaw = await db.createByLaw({
        ...formData,
        societyId: user.societyId || 'soc1',
        createdBy: user.id,
      });

      setSuccess('By-law created successfully!');
      loadByLaws();
      resetForm();
      setIsCreateModalOpen(false);

      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError('Failed to create by-law. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedByLaw) return;

    setIsSubmitting(true);
    setError('');

    try {
      if (!formData.title.trim() || !formData.content.trim()) {
        setError('Please fill in all required fields');
        return;
      }

      const updated = await db.updateByLaw(selectedByLaw.id, formData);

      if (updated) {
        setSuccess('By-law updated successfully!');
        loadByLaws();
        resetForm();
        setIsEditModalOpen(false);
        setSelectedByLaw(null);

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to update by-law');
      }

    } catch (err) {
      setError('Failed to update by-law. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this by-law? This action cannot be undone.')) {
      return;
    }

    try {
      const deleted = await db.deleteByLaw(id);
      if (deleted) {
        setSuccess('By-law deleted successfully!');
        loadByLaws();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete by-law');
      }
    } catch (err) {
      setError('Failed to delete by-law. Please try again.');
    }
  };

  const openEditModal = (bylaw: ByLaw) => {
    setSelectedByLaw(bylaw);
    setFormData({
      title: bylaw.title,
      content: bylaw.content,
      category: bylaw.category,
      isActive: bylaw.isActive,
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (bylaw: ByLaw) => {
    setSelectedByLaw(bylaw);
    setIsViewModalOpen(true);
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'membership':
        return 'bg-blue-100 text-blue-800';
      case 'financial':
        return 'bg-green-100 text-green-800';
      case 'governance':
        return 'bg-purple-100 text-purple-800';
      case 'general':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Society By-Laws Management</h1>
          <p className="text-gray-600 mt-1">Manage and publish society by-laws for members and applicants</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add By-Law
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New By-Law</DialogTitle>
              <DialogDescription>
                Add a new by-law to the society's legal framework
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter by-law title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleSelectChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="membership">Membership</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="governance">Governance</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Enter the full text of the by-law..."
                  rows={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive">Status</Label>
                <Select
                  value={formData.isActive.toString()}
                  onValueChange={(value) => handleSelectChange('isActive', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsCreateModalOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create By-Law'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* By-Laws List */}
      <Card>
        <CardHeader>
          <CardTitle>All By-Laws ({byLaws.length})</CardTitle>
          <CardDescription>
            Manage society by-laws that are visible to members and applicants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byLaws.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No By-Laws Yet</h3>
              <p className="text-gray-600 mb-4">
                Start by creating your first society by-law
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First By-Law
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byLaws.map((bylaw) => (
                    <TableRow key={bylaw.id}>
                      <TableCell className="font-medium">
                        {bylaw.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryBadgeColor(bylaw.category)}>
                          {bylaw.category.charAt(0).toUpperCase() + bylaw.category.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={bylaw.isActive ? 'default' : 'secondary'}>
                          {bylaw.isActive ? 'Active' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(bylaw.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openViewModal(bylaw)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(bylaw)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(bylaw.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit By-Law</DialogTitle>
            <DialogDescription>
              Make changes to the selected by-law
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter by-law title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleSelectChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="governance">Governance</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-content">Content *</Label>
              <Textarea
                id="edit-content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Enter the full text of the by-law..."
                rows={8}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-isActive">Status</Label>
              <Select
                value={formData.isActive.toString()}
                onValueChange={(value) => handleSelectChange('isActive', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsEditModalOpen(false);
                  setSelectedByLaw(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update By-Law'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedByLaw?.title}
              <div className="flex space-x-2">
                <Badge className={getCategoryBadgeColor(selectedByLaw?.category || '')}>
                  {selectedByLaw?.category ?
                    selectedByLaw.category.charAt(0).toUpperCase() + selectedByLaw.category.slice(1) :
                    'Unknown'
                  }
                </Badge>
                <Badge variant={selectedByLaw?.isActive ? 'default' : 'secondary'}>
                  {selectedByLaw?.isActive ? 'Active' : 'Draft'}
                </Badge>
              </div>
            </DialogTitle>
            <DialogDescription>
              Created on {selectedByLaw && new Date(selectedByLaw.createdAt).toLocaleDateString()}
              {selectedByLaw && selectedByLaw.createdAt.getTime() !== selectedByLaw.updatedAt.getTime() &&
                ` • Last updated on ${new Date(selectedByLaw.updatedAt).toLocaleDateString()}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md border">
                {selectedByLaw?.content}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => selectedByLaw && openEditModal(selectedByLaw)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
