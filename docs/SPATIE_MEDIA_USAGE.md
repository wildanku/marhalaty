# Spatie Media Library Integration Guide

## Overview

Spatie Media Library has been integrated with **Event**, **Campaign**, and **Donation** models for managing media files (images, documents, etc.).

---

## Media Collections Setup

### Event Model

- **event-images**: Event promotional images (JPEG, PNG, WebP)
- **event-documents**: Event PDFs and Word documents

### Campaign Model

- **campaign-featured-image**: Single featured image (JPEG, PNG, WebP)
- **campaign-gallery**: Multiple gallery images (JPEG, PNG, WebP)
- **campaign-documents**: Campaign PDFs

### Donation Model

- **donation-receipt**: Receipt images/PDFs
- **donation-proof**: Proof of donation images

---

## Usage Examples

### Uploading Media

```php
// Upload to Event
$event = Event::find(1);
$event->addMediaFromRequest('image')
    ->toMediaCollection('event-images');

// Upload to Campaign (Featured Image - overwrites previous)
$campaign = Campaign::find(1);
$campaign->addMediaFromRequest('featured_image')
    ->toMediaCollection('campaign-featured-image');

// Upload to Campaign Gallery (Multiple files)
$campaign->addMediaFromRequest('gallery_images')
    ->toMediaCollection('campaign-gallery');

// Upload to Donation Receipt
$donation = Donation::find(1);
$donation->addMediaFromRequest('receipt')
    ->toMediaCollection('donation-receipt');
```

### Retrieving Media

```php
// Get first media from collection
$event = Event::find(1);
$image = $event->getFirstMedia('event-images');
$imageUrl = $image->getUrl();

// Get all media from collection
$allImages = $event->getMedia('event-images');

// Get featured image
$campaign = Campaign::find(1);
$featuredImage = $campaign->getFirstMedia('campaign-featured-image');
$imageUrl = $featuredImage?->getUrl();

// Get media with conversions (thumbnails, etc.)
$thumbUrl = $image->getUrl('thumb');
```

### Eager Loading Media

```php
// Optimize queries by eager loading media
$events = Event::with('media')->get();
$campaigns = Campaign::with('media')->get();

// Filter by media existence
$eventsWithImages = Event::whereHas('media', function ($query) {
    $query->where('collection_name', 'event-images');
})->get();
```

### Deleting Media

```php
// Delete specific media
$media = $event->getFirstMedia('event-images');
$media->delete();

// Delete all media from collection
$event->clearMediaCollection('event-images');

// Delete all media
$event->clearMediaCollection();
```

### Converting Images (Thumbnails)

In the `config/media-library.php`, you can define conversions:

```php
// Define in model's registerMediaCollections()
$this->addMediaCollection('event-images')
    ->registerMediaConversions(function (Media $media) {
        $this->addMediaConversion('thumb')
            ->width(150)
            ->height(150);

        $this->addMediaConversion('preview')
            ->width(400)
            ->height(300);
    });
```

---

## Frontend Integration (React/TypeScript)

### Uploading Media from React Component

```typescript
import { useForm } from '@inertiajs/react';

export function MediaUploadForm({ eventId }) {
    const { data, setData, post, processing } = useForm({
        image: null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/events/${eventId}/media/upload`);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="file"
                onChange={(e) => setData('image', e.target.files?.[0] || null)}
                accept="image/*"
            />
            <button type="submit" disabled={processing}>
                Upload
            </button>
        </form>
    );
}
```

### Displaying Media

```typescript
interface EventProps {
    event: Event & { media?: Media[] };
}

export function EventCard({ event }: EventProps) {
    const featuredImage = event.media?.find(
        (m) => m.collection_name === 'event-images'
    );

    return (
        <div>
            {featuredImage && (
                <img
                    src={featuredImage.original_url}
                    alt={event.title}
                    className="w-full h-64 object-cover rounded-lg"
                />
            )}
            <h2>{event.title}</h2>
        </div>
    );
}
```

---

## Controller Example

```php
namespace App\Domains\Event\Controllers;

use App\Domains\Event\Models\Event;
use Illuminate\Http\Request;

class EventMediaController
{
    public function upload(Request $request, Event $event)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,webp|max:5120',
        ]);

        $event->addMediaFromRequest('image')
            ->toMediaCollection('event-images');

        return back()->with('success', 'Image uploaded successfully');
    }

    public function show(Event $event)
    {
        return inertia('Event/Show', [
            'event' => $event->load('media'),
        ]);
    }

    public function deleteMedia(Event $event, $mediaId)
    {
        $media = $event->media()->findOrFail($mediaId);
        $media->delete();

        return back()->with('success', 'Image deleted');
    }
}
```

---

## Database Schema

The `media` table stores all uploaded files with:

- `id`: Primary key
- `model_type`: Model class (e.g., `App\Domains\Event\Models\Event`)
- `model_id`: Associated model ID
- `collection_name`: Collection name (e.g., `event-images`)
- `name`: Original filename
- `file_name`: Stored filename
- `mime_type`: File MIME type
- `disk`: Storage disk (e.g., `public`)
- `size`: File size in bytes
- `manipulations`: JSON data for transformations
- `custom_properties`: JSON for custom data
- `generated_conversions`: Available image conversions
- `responsive_images`: Responsive image variants
- `order_column`: Display order

---

## Storage Configuration

Files are stored in `storage/app/public/`. For production, configure:

1. Create symbolic link:

    ```bash
    php artisan storage:link
    ```

2. Update `config/media-library.php` disk settings for production environments.

---

## Best Practices

- ✅ Always validate file uploads (size, type, dimensions)
- ✅ Use `with('media')` when loading models with images to avoid N+1 queries
- ✅ Generate conversions for common sizes (thumb, preview, full)
- ✅ Store sensitive files on `private` disk
- ✅ Clean up orphaned media in migrations or cleanup jobs
- ✅ Use CDN for serving media in production
- ✅ Set appropriate `max_file_size` in `config/media-library.php`
