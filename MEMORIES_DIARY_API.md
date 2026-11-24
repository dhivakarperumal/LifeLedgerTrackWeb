# Life Ledger - Complete Memories, Diary & Media API Documentation

This document provides complete, production-ready documentation for the **Memories**, **Diary**, and **Media** APIs in the Life Ledger web application.

---

## Table of Contents
1. [Overview & Architecture](#1-overview--architecture)
2. [MySQL Database Structure](#2-mysql-database-structure)
3. [Authentication & Security](#3-authentication--security)
4. [Media Upload System (Images & Videos)](#4-media-upload-system-images--videos)
5. [Memories API Reference](#5-memories-api-reference)
   - [POST /api/memories](#post-apimemories)
   - [GET /api/memories](#get-apimemories)
   - [GET /api/memories/:id](#get-apimemoriesid)
   - [GET /api/memories/user/:userId](#get-apimemoriesuseruserid)
   - [PUT /api/memories/:id](#put-apimemoriesid)
   - [PATCH /api/memories/:id/favorite](#patch-apimemoriesidfavorite)
   - [DELETE /api/memories/:id](#delete-apimemoriesid)
   - [Category Endpoints](#memory-category-endpoints)
6. [Diary API Reference](#6-diary-api-reference)
   - [POST /api/diary](#post-apidiary)
   - [GET /api/diary](#get-apidiary)
   - [GET /api/diary/:id](#get-apidiaryid)
   - [GET /api/diary/user/:userId](#get-apidiaryuseruserid)
   - [PUT /api/diary/:id](#put-apidiaryid)
   - [PATCH /api/diary/:id/favorite](#patch-apidiaryidfavorite)
   - [DELETE /api/diary/:id](#delete-apidiaryid)
   - [POST /api/diary/:id/attachments](#post-apidiaryidattachments)
   - [DELETE /api/diary/attachments/:id](#delete-apidiaryattachmentsid)
   - [Category Endpoints](#diary-category-endpoints)
7. [Media API Reference](#7-media-api-reference)
   - [POST /api/media/upload](#post-apimediaupload)
   - [GET /api/media](#get-apimedia)
   - [GET /api/media/:id](#get-apimediaid)
   - [GET /api/media/memory/:memoryId](#get-apimediamemorymemoryid)
   - [GET /api/media/diary/:diaryId](#get-apimediadiarydiaryid)
   - [GET /api/media/stream/:id](#get-apimediastreamid)
   - [DELETE /api/media/:id](#delete-apimediaid)
8. [Frontend React Integration Guide](#8-frontend-react-integration-guide)
9. [Error Codes & Responses](#9-error-codes--responses)
10. [Postman Testing Collection & Examples](#10-postman-testing-collection--examples)

---

## 1. Overview & Architecture

The Memories and Diary system enables users to create, document, and preserve life events, thoughts, photos, and high-definition video recordings.

### Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: MySQL / MariaDB (Connection pooling with `mysql2/promise`)
- **File Upload**: Multer (`diskStorage` chunked streaming to prevent high RAM consumption)
- **Frontend**: React.js, Vite, Axios, Tailwind CSS
- **Authentication**: JWT Bearer token and App Lock verification

### Directory Layout
```
Backend/
├── uploads/
│   ├── images/              # Stored image files (JPG, PNG, WEBP)
│   ├── videos/              # Stored video files (MP4, MOV, WEBM)
│   ├── audio/               # Stored audio/voice recordings
│   └── files/               # Documents and archives
├── src/
│   ├── config/
│   │   └── db.js            # MySQL connection & table migration
│   ├── controllers/
│   │   ├── memoryController.js
│   │   ├── diaryController.js
│   │   └── mediaController.js
│   ├── middleware/
│   │   ├── auth.js          # JWT & token authorization
│   │   ├── appLock.js       # App Lock session verification
│   │   └── uploadMiddleware.js # Multer configuration & validation
│   ├── routes/
│   │   ├── memoryRoutes.js
│   │   ├── diaryRoutes.js
│   │   └── mediaRoutes.js
│   └── services/
│       └── mediaService.js  # Media persistence, video streaming, disk cleanup
```

---

## 2. MySQL Database Structure

### Table: `memories`
Stores personal memories created by users.

```sql
CREATE TABLE IF NOT EXISTS memories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category VARCHAR(100) NULL,
  category_id INT NULL,
  category_name VARCHAR(120) NULL,
  category_color VARCHAR(30) DEFAULT '#8B5CF6',
  memory_date DATE NOT NULL,
  location VARCHAR(255) NULL,
  mood VARCHAR(80) DEFAULT 'Happy',
  tags JSON NULL,
  status ENUM('published', 'draft') DEFAULT 'published',
  is_favorite BOOLEAN DEFAULT FALSE,
  media_url VARCHAR(500) NULL,
  media_gallery JSON NULL,
  media_type VARCHAR(50) DEFAULT 'image',
  voice_note TEXT NULL,
  created_by VARCHAR(50) NULL,
  updated_by VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_memory_user_date (user_id, memory_date),
  KEY idx_memory_category (category_id),
  CONSTRAINT fk_memory_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_memory_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

### Table: `diary_entries`
Stores diary and journal entries.

```sql
CREATE TABLE IF NOT EXISTS diary_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  category VARCHAR(100) NULL,
  category_id INT NULL,
  category_name VARCHAR(120) NULL,
  mood VARCHAR(50) DEFAULT 'Normal',
  tags JSON NULL,
  location VARCHAR(255) NULL,
  entry_date DATE NOT NULL,
  entry_time TIME NULL,
  status ENUM('published', 'draft') DEFAULT 'published',
  is_favorite BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  image_path VARCHAR(500) NULL,
  video_path VARCHAR(500) NULL,
  audio_path VARCHAR(500) NULL,
  file_path VARCHAR(500) NULL,
  media_files JSON NULL,
  created_by VARCHAR(50) NULL,
  updated_by VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_diary_user_date (user_id, entry_date),
  KEY idx_diary_category (category_id),
  CONSTRAINT fk_diary_entry_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_diary_entry_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

### Table: `media_files`
Central relational table storing all uploaded images, videos, audio, and documents associated with memories and diary entries.

```sql
CREATE TABLE IF NOT EXISTS media_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  memory_id INT NULL,
  diary_id INT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL,    -- 'image', 'video', 'audio', 'file'
  mime_type VARCHAR(100) NOT NULL,   -- e.g. 'image/jpeg', 'video/mp4'
  file_size BIGINT NOT NULL,          -- Size in bytes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_media_user (user_id),
  KEY idx_media_memory (memory_id),
  KEY idx_media_diary (diary_id),
  KEY idx_media_type (file_type),
  CONSTRAINT fk_media_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_media_memory FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_diary FOREIGN KEY (diary_id) REFERENCES diary_entries(id) ON DELETE CASCADE
);
```

---

## 3. Authentication & Security

All API routes require authentication using a JSON Web Token (JWT).

### Headers Required:
```http
Authorization: Bearer <JWT_TOKEN>
```

If App Lock is enabled on the user's account, provide:
```http
X-App-Lock-Token: <APP_LOCK_SESSION_TOKEN>
```

### Security Guarantees:
1. **Ownership Enforcement**: Every CRUD and file query strictly checks `WHERE user_id = ?` (or role = 'admin').
2. **Path Traversal Protection**: Uploaded file names are stripped of directory separators (`/`, `\`, `..`), sanitized with regex, and prepended with a cryptographically secure random timestamp suffix.
3. **MIME & Extension Double-Validation**: File extensions and content MIME types are verified against an allowlist before saving to disk.
4. **Automatic Disk Cleanup**: If database insertion fails during a multi-file upload, newly written files are automatically deleted (`fs.unlinkSync`) so orphaned files never accumulate.
5. **Safe File Removal**: When a memory, diary entry, or media file is deleted, physical files on disk are safely unlinked.

---

## 4. Media Upload System (Images & Videos)

### Image Upload Specifications
- **Supported Formats**: `JPG`, `JPEG`, `PNG`, `WEBP`, `GIF`, `BMP`
- **Max File Size**: 50 MB per image
- **Storage Location**: `Backend/uploads/images/`
- **Public URL**: `/uploads/images/<filename>`
- **Database Entity**: Recorded in `media_files` with `file_type: "image"`

### Video Upload Specifications
- **Supported Formats**: `MP4`, `MOV`, `WEBM`, `M4V`, `MKV`
- **Max File Size**: 250 MB per video
- **Streaming Disk Storage**: Multer streams chunks directly to disk instead of buffering the entire video in Node.js heap memory.
- **Storage Location**: `Backend/uploads/videos/`
- **Public URL**: `/uploads/videos/<filename>`
- **Database Entity**: Recorded in `media_files` with `file_type: "video"`
- **Streaming Endpoint**: Supports HTTP Range headers (`Range: bytes=0-1048576`) via `GET /api/media/stream/:id` for seamless HTML5 video player scrubbing and playback.

---

## 5. Memories API Reference

### Base URL: `/api/memories`

---

### `POST /api/memories`
Creates a new memory. Supports both `multipart/form-data` (uploading image and video files directly) and `application/json`.

#### Headers:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

#### FormData Parameters:
| Field | Type | Required | Description |
|---|---|---|---|
| `title` | Text | **Yes** | Title of the memory |
| `description` | Text | No | Detailed description |
| `category` | Text | No | Category name (e.g. "Family", "Travel") |
| `category_id` | Number | No | ID of existing category |
| `memory_date` | Text (YYYY-MM-DD) | No | Date of the memory (defaults to today) |
| `location` | Text | No | Location of the memory |
| `mood` | Text | No | Mood (e.g. "Happy", "Excited", "Grateful") |
| `tags` | Text / JSON Array | No | Comma-separated or JSON array of tags |
| `status` | Text | No | `'published'` or `'draft'` (default: `'published'`) |
| `is_favorite` | Text / Boolean | No | `'1'`, `'true'`, or `1` |
| `media` | File (Multiple) | No | Up to 20 image or video files |
| `images` | File (Multiple) | No | Alternative field name for image files |
| `videos` | File (Multiple) | No | Alternative field name for video files |

#### Example Response (`201 Created`):
```json
{
  "success": true,
  "message": "Memory created successfully",
  "data": {
    "id": 14,
    "user_id": "USR001",
    "title": "Summer Beach Trip",
    "description": "Fun weekend with friends at the beach resort.",
    "category": "Vacation",
    "category_id": 3,
    "category_name": "Vacation",
    "category_color": "#8B5CF6",
    "memory_date": "2026-11-20",
    "location": "Goa Beach Resort",
    "mood": "Excited",
    "tags": ["travel", "beach", "summer"],
    "status": "published",
    "is_favorite": true,
    "favorite": true,
    "voice_note": "",
    "media_url": "/uploads/images/1732456789-a1b2-beach_photo.jpg",
    "media_type": "image",
    "media_gallery": [
      "/uploads/images/1732456789-a1b2-beach_photo.jpg",
      "/uploads/videos/1732456790-c3d4-sunset_drone.mp4"
    ],
    "images": [
      {
        "id": 101,
        "file_name": "1732456789-a1b2-beach_photo.jpg",
        "original_name": "beach_photo.jpg",
        "file_url": "/uploads/images/1732456789-a1b2-beach_photo.jpg",
        "file_type": "image",
        "mime_type": "image/jpeg",
        "file_size": 2450800,
        "created_at": "2026-11-20T10:15:30.000Z"
      }
    ],
    "videos": [
      {
        "id": 102,
        "file_name": "1732456790-c3d4-sunset_drone.mp4",
        "original_name": "sunset_drone.mp4",
        "file_url": "/uploads/videos/1732456790-c3d4-sunset_drone.mp4",
        "file_type": "video",
        "mime_type": "video/mp4",
        "file_size": 48290000,
        "created_at": "2026-11-20T10:15:32.000Z"
      }
    ],
    "media_files": [
      {
        "id": 101,
        "file_name": "1732456789-a1b2-beach_photo.jpg",
        "original_name": "beach_photo.jpg",
        "file_url": "/uploads/images/1732456789-a1b2-beach_photo.jpg",
        "file_type": "image",
        "mime_type": "image/jpeg",
        "file_size": 2450800,
        "created_at": "2026-11-20T10:15:30.000Z"
      },
      {
        "id": 102,
        "file_name": "1732456790-c3d4-sunset_drone.mp4",
        "original_name": "sunset_drone.mp4",
        "file_url": "/uploads/videos/1732456790-c3d4-sunset_drone.mp4",
        "file_type": "video",
        "mime_type": "video/mp4",
        "file_size": 48290000,
        "created_at": "2026-11-20T10:15:32.000Z"
      }
    ],
    "created_at": "2026-11-20T10:15:30.000Z",
    "updated_at": "2026-11-20T10:15:30.000Z"
  }
}
```

---

### `GET /api/memories`
Fetches a paginated, searchable, and filtered list of memories belonging to the logged-in user. Each item contains complete related image and video metadata.

#### Query Parameters:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `search` | String | `""` | Search text in title, description, location, mood, tags, category |
| `category` | String | `"all"` | Filter by category ID or category name |
| `start_date`| String (YYYY-MM-DD)| `""` | Filter memories on or after this date |
| `end_date` | String (YYYY-MM-DD)| `""` | Filter memories on or before this date |
| `date` | String (YYYY-MM-DD)| `""` | Filter memories on an exact date |
| `favorite` | String | `""` | Set to `"true"` or `"1"` for favorites only |
| `status` | String | `"all"` | `'published'` or `'draft'` |
| `user_id` | String | `""` | (Admins only) Filter by specific user ID |
| `page` | Number | `1` | Page number |
| `limit` | Number / String | `"all"` | Number of records per page (or `"all"`) |

#### Example Response (`200 OK`):
```json
{
  "success": true,
  "message": "Memories fetched successfully",
  "data": [
    {
      "id": 14,
      "user_id": "USR001",
      "title": "Summer Beach Trip",
      "description": "Fun weekend with friends at the beach resort.",
      "category": "Vacation",
      "category_id": 3,
      "category_name": "Vacation",
      "memory_date": "2026-11-20",
      "location": "Goa Beach Resort",
      "mood": "Excited",
      "images": [
        {
          "id": 101,
          "file_name": "1732456789-a1b2-beach_photo.jpg",
          "original_name": "beach_photo.jpg",
          "file_url": "/uploads/images/1732456789-a1b2-beach_photo.jpg",
          "file_type": "image",
          "mime_type": "image/jpeg",
          "file_size": 2450800,
          "created_at": "2026-11-20T10:15:30.000Z"
        }
      ],
      "videos": [
        {
          "id": 102,
          "file_name": "1732456790-c3d4-sunset_drone.mp4",
          "original_name": "sunset_drone.mp4",
          "file_url": "/uploads/videos/1732456790-c3d4-sunset_drone.mp4",
          "file_type": "video",
          "mime_type": "video/mp4",
          "file_size": 48290000,
          "created_at": "2026-11-20T10:15:32.000Z"
        }
      ],
      "created_at": "2026-11-20T10:15:30.000Z",
      "updated_at": "2026-11-20T10:15:30.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 1,
    "totalPages": 1
  }
}
```

---

### `GET /api/memories/:id`
Retrieves a single memory by ID with complete related media information.

#### Example Response (`200 OK`):
```json
{
  "success": true,
  "message": "Memory fetched successfully",
  "data": {
    "id": 14,
    "user_id": "USR001",
    "title": "Summer Beach Trip",
    "description": "Fun weekend with friends at the beach resort.",
    "category": "Vacation",
    "images": [
      {
        "id": 101,
        "file_name": "1732456789-a1b2-beach_photo.jpg",
        "file_url": "/uploads/images/1732456789-a1b2-beach_photo.jpg",
        "file_type": "image",
        "file_size": 2450800
      }
    ],
    "videos": [
      {
        "id": 102,
        "file_name": "1732456790-c3d4-sunset_drone.mp4",
        "file_url": "/uploads/videos/1732456790-c3d4-sunset_drone.mp4",
        "file_type": "video",
        "file_size": 48290000
      }
    ]
  }
}
```

---

### `GET /api/memories/user/:userId`
Retrieves all memories belonging to a specific `user_id`. (Only accessible by the owning user or an administrator).

---

### `PUT /api/memories/:id`
Updates an existing memory. Supports appending new media files and removing specific existing media items.

#### Parameters:
- All fields from `POST /api/memories` are accepted as updates.
- `removed_media_ids` (JSON array or comma-separated list of media IDs to permanently delete from MySQL and disk).
- New files attached under `media`, `images`, or `videos` are automatically uploaded, validated, and appended to `media_files`.

#### Example Response (`200 OK`):
```json
{
  "success": true,
  "message": "Memory updated successfully",
  "data": {
    "id": 14,
    "title": "Summer Beach Trip (Updated)",
    "images": [ ... ],
    "videos": [ ... ]
  }
}
```

---

### `PATCH /api/memories/:id/favorite`
Toggles favorite status.

#### Example Response (`200 OK`):
```json
{
  "success": true,
  "message": "Added to favorites",
  "data": { "id": 14, "is_favorite": true },
  "is_favorite": true
}
```

---

### `DELETE /api/memories/:id`
Deletes the memory and safely unlinks all associated physical image and video files from disk.

#### Example Response (`200 OK`):
```json
{
  "success": true,
  "message": "Memory and associated media deleted successfully.",
  "data": { "id": 14 }
}
```

---

## 6. Diary API Reference

### Base URL: `/api/diary`

---

### `POST /api/diary`
Creates a new diary or journal entry with optional image, video, and document uploads.

#### FormData / JSON Parameters:
| Field | Type | Required | Description |
|---|---|---|---|
| `title` | Text | **Yes** | Diary title |
| `content` | Text / HTML | **Yes** | Journal content body |
| `entry_date` | Text (YYYY-MM-DD) | **Yes** | Entry date |
| `entry_time` | Text (HH:MM) | No | Time of entry |
| `category` | Text | No | Category (e.g. "Personal", "Work", "Reflections") |
| `category_id` | Number | No | Linked category ID |
| `mood` | Text | No | Mood emoji/name (e.g. "Happy", "Calm", "Thoughtful") |
| `location` | Text | No | Location |
| `tags` | Text / Array | No | Tags |
| `status` | Text | No | `'published'` or `'draft'` |
| `is_favorite` | Boolean / Number | No | `true`, `false`, `1`, `0` |
| `is_private` | Boolean / Number | No | `true` or `false` |
| `is_locked` | Boolean / Number | No | `true` or `false` |
| `media` | File (Multiple) | No | Upload images, videos, audio |

#### Example Response (`201 Created`):
```json
{
  "success": true,
  "message": "Diary entry created successfully",
  "data": {
    "id": 8,
    "user_id": "USR001",
    "title": "A Productive Monday",
    "content": "<p>Today we finalized the new system architecture.</p>",
    "category": "Work",
    "category_id": 5,
    "category_name": "Work",
    "entry_date": "2026-11-24",
    "entry_time": "14:30",
    "mood": "Confident",
    "tags": ["work", "milestone"],
    "status": "published",
    "is_favorite": false,
    "images": [
      {
        "id": 201,
        "file_name": "1732457890-e5f6-whiteboard_notes.png",
        "file_url": "/uploads/images/1732457890-e5f6-whiteboard_notes.png",
        "file_type": "image",
        "file_size": 1820400
      }
    ],
    "videos": [
      {
        "id": 202,
        "file_name": "1732457891-g7h8-demo_walkthrough.mp4",
        "file_url": "/uploads/videos/1732457891-g7h8-demo_walkthrough.mp4",
        "file_type": "video",
        "file_size": 65120000
      }
    ],
    "created_at": "2026-11-24T09:00:00.000Z",
    "updated_at": "2026-11-24T09:00:00.000Z"
  }
}
```

---

### `GET /api/diary`
Fetches a list of diary entries with full search, date filter, mood filter, category filter, and paginated response.

#### Query Parameters:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `search` | String | `""` | Search in title, content, location, mood, tags, category |
| `category` | String | `"all"` | Category ID or name |
| `start_date`| String (YYYY-MM-DD)| `""` | Start date |
| `end_date` | String (YYYY-MM-DD)| `""` | End date |
| `date` | String (YYYY-MM-DD)| `""` | Exact date |
| `mood` | String | `"all"` | Filter by mood |
| `status` | String | `"all"` | `'published'` or `'draft'` |
| `favorite` | String | `""` | `'true'` or `'1'` |
| `user_id` | String | `""` | (Admin only) Filter by user ID |
| `page` | Number | `1` | Page number |
| `limit` | Number / String | `"all"` | Page size or `"all"` |

---

### `GET /api/diary/:id`
Retrieves a single diary entry by ID with complete image, video, and attachment records.

---

### `GET /api/diary/user/:userId`
Retrieves diary entries for a specific user ID.

---

### `PUT /api/diary/:id`
Updates a diary entry, appends new media files, and deletes any IDs passed in `removed_media_ids` or `removed_image_ids` from disk and database.

---

### `DELETE /api/diary/:id`
Deletes a diary entry and unlinks all attached physical image and video files.

---

### `POST /api/diary/:id/attachments`
Uploads an individual attachment file directly to a diary entry.

---

### `DELETE /api/diary/attachments/:id`
Deletes a specific attachment by media ID.

---

## 7. Media API Reference

### Base URL: `/api/media`

The standalone Media API allows uploading and managing media independent of or directly associated with memories or diary entries.

---

### `POST /api/media/upload`
Uploads multiple images and videos.

#### Headers:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

#### FormData:
- `media`: File or files (JPG, PNG, WEBP, MP4, MOV, WEBM)
- `memory_id` (Optional): ID of memory to associate with
- `diary_id` (Optional): ID of diary entry to associate with

#### Example Response (`201 Created`):
```json
{
  "success": true,
  "message": "2 file(s) uploaded successfully.",
  "data": [
    {
      "id": 105,
      "user_id": "USR001",
      "memory_id": 14,
      "diary_id": null,
      "file_name": "1732459000-a1b2-scenery.jpg",
      "original_name": "scenery.jpg",
      "file_path": "uploads/images/1732459000-a1b2-scenery.jpg",
      "file_url": "/uploads/images/1732459000-a1b2-scenery.jpg",
      "file_type": "image",
      "mime_type": "image/jpeg",
      "file_size": 1540300,
      "created_at": "2026-11-24T12:00:00.000Z"
    },
    {
      "id": 106,
      "user_id": "USR001",
      "memory_id": 14,
      "diary_id": null,
      "file_name": "1732459001-c3d4-waterfall.mp4",
      "original_name": "waterfall.mp4",
      "file_path": "uploads/videos/1732459001-c3d4-waterfall.mp4",
      "file_url": "/uploads/videos/1732459001-c3d4-waterfall.mp4",
      "file_type": "video",
      "mime_type": "video/mp4",
      "file_size": 35200000,
      "created_at": "2026-11-24T12:00:01.000Z"
    }
  ],
  "images": [ ... ],
  "videos": [ ... ]
}
```

---

### `GET /api/media`
Lists uploaded media files with filtering.

#### Query Parameters:
- `memory_id`: Filter by memory ID
- `diary_id`: Filter by diary entry ID
- `file_type`: `'image'`, `'video'`, or `'all'`
- `search`: Search original filename
- `page`: Page number (default: 1)
- `limit`: Page size (default: 50)

---

### `GET /api/media/stream/:id`
Streams a video file with HTTP 206 Partial Content range requests. Ideal for HTML5 `<video>` tags allowing smooth seeking and instant playback without downloading large videos upfront.

#### Headers:
```http
Range: bytes=0-1048576
```

#### Response:
```http
HTTP/1.1 206 Partial Content
Content-Range: bytes 0-1048576/35200000
Accept-Ranges: bytes
Content-Length: 1048577
Content-Type: video/mp4
```

---

### `DELETE /api/media/:id`
Deletes a single media file from the server disk and MySQL database. Validates user ownership.

```json
{
  "success": true,
  "message": "Media file deleted successfully.",
  "data": { "id": 105 }
}
```

---

## 8. Frontend React Integration Guide

### 1. Image and Video Upload using `FormData`

```jsx
import api from "./api";

export const uploadMemoryWithMedia = async (formData, onProgress) => {
  const response = await api.post("/memories", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (onProgress) onProgress(percent);
      }
    },
  });
  return response.data?.data || response.data;
};
```

### 2. Pre-upload Image & Video Previews

```jsx
import React, { useState } from "react";

export const MediaPicker = ({ onFilesSelected }) => {
  const [previews, setPreviews] = useState([]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newPreviews = selectedFiles.map((file) => ({
      file,
      name: file.name,
      isVideo: file.type.startsWith("video/"),
      url: URL.createObjectURL(file),
    }));
    setPreviews(newPreviews);
    onFilesSelected(selectedFiles);
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        onChange={handleFileChange}
        className="block w-full text-sm text-slate-500"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {previews.map((item, index) => (
          <div key={index} className="relative rounded-xl overflow-hidden border border-slate-200 h-32 bg-slate-900">
            {item.isVideo ? (
              <video src={item.url} className="h-full w-full object-cover" controls />
            ) : (
              <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
            )}
            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded truncate max-w-[90%]">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 3. Displaying Uploaded Images in a Responsive Gallery & HTML5 Video Player

```jsx
import React from "react";

const BASE_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

const resolveUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

export const MemoryMediaGallery = ({ images = [], videos = [], onDeleteMedia }) => {
  return (
    <div className="space-y-6">
      {/* Images Section */}
      {images.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
            Photos ({images.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className="group relative rounded-2xl overflow-hidden border border-slate-200 h-48 bg-slate-100 shadow-sm">
                <img
                  src={resolveUrl(img.file_url)}
                  alt={img.original_name || img.file_name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {onDeleteMedia && (
                  <button
                    onClick={() => onDeleteMedia(img.id)}
                    className="absolute top-2 right-2 bg-rose-600/80 hover:bg-rose-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition shadow"
                    title="Delete image"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos Section */}
      {videos.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
            Videos ({videos.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((vid) => (
              <div key={vid.id} className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black shadow-sm">
                <video
                  src={resolveUrl(vid.file_url)}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-64 object-contain"
                />
                <div className="p-3 bg-slate-900 text-white flex justify-between items-center text-xs">
                  <span className="truncate">{vid.original_name || vid.file_name}</span>
                  {onDeleteMedia && (
                    <button
                      onClick={() => onDeleteMedia(vid.id)}
                      className="text-rose-400 hover:text-rose-300 ml-2"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 9. Error Codes & Responses

All endpoints return uniform error structures:

```json
{
  "success": false,
  "message": "Human readable error description",
  "error": "Detailed error message or code"
}
```

### Common HTTP Status Codes:
| Status | Meaning | Reason |
|---|---|---|
| `400 Bad Request` | Missing required fields (`title`, `content`), invalid IDs, or unsupported file formats. |
| `401 Unauthorized` | Missing, expired, or invalid JWT Bearer token. |
| `403 Forbidden` | Accessing another user's private records without admin privileges. |
| `404 Not Found` | Memory, diary entry, or media file does not exist. |
| `413 Payload Too Large`| Uploaded file exceeds the configured file size limit (50 MB for images, 250 MB for videos). |
| `423 Locked` | App Lock is active and requires challenge token verification. |
| `500 Server Error` | Database or filesystem failure. |

---

## 10. Postman Testing Collection & Examples

### 1. Create a Memory with Image and Video
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/memories`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
- **Body**: `form-data`
  - `title`: `Family Reunion 2026`
  - `description`: `Annual reunion at Lake Tahoe`
  - `category`: `Family`
  - `memory_date`: `2026-11-24`
  - `location`: `Lake Tahoe, CA`
  - `mood`: `Happy`
  - `media`: [Attach `photo.jpg` (File)]
  - `media`: [Attach `clip.mp4` (File)]

### 2. Fetch All Memories
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/memories?category=Family&page=1&limit=10`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`

### 3. Update Memory and Remove an Image
- **Method**: `PUT`
- **URL**: `http://localhost:5000/api/memories/1`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
- **Body**: `form-data`
  - `title`: `Family Reunion 2026 - Updated`
  - `removed_media_ids`: `[101]`
  - `media`: [Attach `new_photo.png` (File)]

### 4. Create Diary Entry with Attachment
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/diary`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
- **Body**: `form-data`
  - `title`: `Deep Work Day`
  - `content`: `<p>Completed the memory and diary upload architecture.</p>`
  - `entry_date`: `2026-11-24`
  - `category`: `Productivity`
  - `media`: [Attach `summary.jpg` (File)]

### 5. Stream Video
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/media/stream/102`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
  - `Range`: `bytes=0-1048576`

---

## Summary of Accomplished Requirements
✔ Full CRUD for Memories and Diary with date, category, search, and user filtering.  
✔ Multer image upload supporting JPG, JPEG, PNG, WEBP with size and MIME validation.  
✔ Multer video upload supporting MP4, MOV, WEBM with streaming chunked disk writes.  
✔ Dedicated `media_files` MySQL table with foreign keys, cascading deletion, and proper indexing.  
✔ Consistent GET responses providing `images`, `videos`, and complete metadata.  
✔ Video Range streaming endpoint for smooth HTML5 video playback.  
✔ Safe file deletion and automatic rollback cleanup on database errors.  
✔ Seamless frontend integration in React with upload progress, preview, responsive gallery, and HTML5 video controls.  
✔ Production documentation in `MEMORIES_DIARY_API.md`.
