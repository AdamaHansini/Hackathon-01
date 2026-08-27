import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { postsApi } from '../../api/postsApi';
import { toast } from '../../store/useToastStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Upload, X, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const postSchema = z.object({
  type: z.enum(['LOST', 'FOUND']),
  itemName: z.string().min(3, 'Item name must be at least 3 characters'),
  category: z.string().min(1, 'Please select a category'),
  publicDescription: z.string().min(10, 'Please provide more detail (at least 10 characters)'),
  color: z.string().optional(),
  brand: z.string().optional(),
  publicCharacteristics: z.string(), // We'll split this by comma
  lostOrFoundDate: z.string().min(1, 'Date is required'),
  lostOrFoundTime: z.string().min(1, 'Time is required'),
  locationName: z.string().min(3, 'Please provide a descriptive location name'),
  city: z.string().min(2, 'City is required'),
  visibility: z.enum(['PUBLIC', 'HIDDEN', 'PRIVATE']).optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

export const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as 'LOST' | 'FOUND') || 'LOST';

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      type: initialType,
      lostOrFoundDate: format(new Date(), 'yyyy-MM-dd'),
      visibility: 'PUBLIC',
    },
  });

  const postType = watch('type');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (images.length + selectedFiles.length > 5) {
        toast.error('Maximum 5 images allowed');
        return;
      }
      
      setImages((prev) => [...prev, ...selectedFiles]);
      
      const newPreviewUrls = selectedFiles.map((file) => URL.createObjectURL(file));
      setImagePreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onSubmit = async (data: PostFormValues) => {
    try {
      // 1. Create the post
      const postData = {
        ...data,
        publicCharacteristics: data.publicCharacteristics
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        // Providing dummy coordinates for now since we don't have a map picker
        approximateCoordinates: {
          type: 'Point',
          coordinates: [78.4747, 17.3616], // Hyderabad coords as default
          radiusMeters: 500,
        },
      };

      const response = await postsApi.createPost(postData);
      
      if (response.success && response.data?.post) {
        const postId = response.data.post._id;

        // 2. Upload images if any
        if (images.length > 0) {
          setIsUploading(true);
          const formData = new FormData();
          images.forEach((img) => formData.append('images', img));
          
          try {
            await postsApi.uploadImages(postId, formData);
          } catch (uploadError: any) {
            toast.error('Post created, but failed to upload some images.');
          } finally {
            setIsUploading(false);
          }
        }

        toast.success(`Successfully reported ${postType.toLowerCase()} item!`);
        navigate(`/my-posts/${postId}`); // Navigate to manage page to add verification questions
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create post');
    }
  };

  const categories = [
    { label: 'Select Category', value: '' },
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Documents', value: 'Documents' },
    { label: 'Wallet', value: 'Wallet' },
    { label: 'Keys', value: 'Keys' },
    { label: 'Bags', value: 'Bags' },
    { label: 'Jewelry', value: 'Jewelry' },
    { label: 'Clothing', value: 'Clothing' },
    { label: 'Pets', value: 'Pets' },
    { label: 'Other', value: 'Other' },
  ];

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-text">Report an Item</h1>
        <p className="text-muted-text mt-1">
          Provide as much public detail as possible to help the Smart Match system.
          <span className="font-semibold text-dark-text block mt-1">
            Do not include private identifying information (e.g. ID numbers) in the public description.
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Type Selection */}
        <div className="bg-surface border border-taupe-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Post Type</h2>
          <div className="flex gap-4">
            <label className={`flex-1 flex items-center justify-center cursor-pointer rounded-lg border-2 p-4 transition-all ${postType === 'LOST' ? 'border-error bg-error/5 text-error' : 'border-taupe-border bg-surface text-muted-text hover:border-error/50'}`}>
              <input type="radio" value="LOST" className="sr-only" {...register('type')} />
              <span className="font-bold">I Lost Something</span>
            </label>
            <label className={`flex-1 flex items-center justify-center cursor-pointer rounded-lg border-2 p-4 transition-all ${postType === 'FOUND' ? 'border-success bg-success/5 text-success' : 'border-taupe-border bg-surface text-muted-text hover:border-success/50'}`}>
              <input type="radio" value="FOUND" className="sr-only" {...register('type')} />
              <span className="font-bold">I Found Something</span>
            </label>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-surface border border-taupe-border rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-dark-text">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Item Name"
              placeholder="e.g. iPhone 13 Pro, Black Wallet"
              {...register('itemName')}
              error={errors.itemName?.message}
            />
            <Select
              label="Category"
              options={categories}
              {...register('category')}
              error={errors.category?.message}
            />
          </div>

          <Textarea
            label="Public Description"
            placeholder="Describe the item. Remember to keep private details hidden."
            rows={4}
            {...register('publicDescription')}
            error={errors.publicDescription?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Color"
              placeholder="e.g. Black, Blue"
              {...register('color')}
            />
            <Input
              label="Brand (Optional)"
              placeholder="e.g. Apple, Nike"
              {...register('brand')}
            />
          </div>

          <Input
            label="Public Characteristics (Comma separated)"
            placeholder="e.g. scratch on screen, distinct sticker"
            {...register('publicCharacteristics')}
          />
        </div>

        {/* Time and Location */}
        <div className="bg-surface border border-taupe-border rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-dark-text flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            When & Where
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              type="date"
              label={`Date ${postType === 'LOST' ? 'Lost' : 'Found'}`}
              {...register('lostOrFoundDate')}
              error={errors.lostOrFoundDate?.message}
            />
            <Input
              type="time"
              label={`Time ${postType === 'LOST' ? 'Lost' : 'Found'}`}
              {...register('lostOrFoundTime')}
              error={errors.lostOrFoundTime?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Location Name"
              placeholder="e.g. Central Park, Main St Coffee Shop"
              {...register('locationName')}
              error={errors.locationName?.message}
            />
            <Input
              label="City"
              placeholder="e.g. Hyderabad"
              {...register('city')}
              error={errors.city?.message}
            />
          </div>
          <p className="text-xs text-muted-text">
            * Note: Map integration is currently disabled. Coordinates will be set to the city center by default.
          </p>
        </div>

        {/* Images */}
        <div className="bg-surface border border-taupe-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-dark-text">Images (Max 5)</h2>
          
          <div className="flex flex-wrap gap-4">
            {imagePreviewUrls.map((url, index) => (
              <div key={index} className="relative h-24 w-24 rounded-lg overflow-hidden border border-taupe-border">
                <img src={url} alt={`Preview ${index}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-error transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            {images.length < 5 && (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-taupe-border bg-light-beige hover:border-primary-button/50 transition-colors">
                <Upload className="h-6 w-6 text-muted-text mb-1" />
                <span className="text-xs text-muted-text font-medium">Upload</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting || isUploading}>
            {isUploading ? 'Uploading Images...' : 'Submit Report'}
          </Button>
        </div>
      </form>
    </div>
  );
};
