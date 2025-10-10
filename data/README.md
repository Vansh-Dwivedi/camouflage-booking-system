# Data Directory

This directory contains the JSON database file (`database.json`) used by the Camouflage Booking System.

## Database Type: JSON File Storage

- **File**: `database.json`
- **Format**: JSON
- **Purpose**: Stores all application data (users, services, bookings, settings)
- **Benefits**: 
  - No database server required
  - Serverless-friendly
  - Easy to backup and restore
  - Human-readable format
  - Version control friendly

## Database Structure

```json
{
  "data": {
    "users": [...],
    "services": [...], 
    "bookings": [...],
    "settings": [...]
  },
  "nextId": {
    "users": 1,
    "services": 1,
    "bookings": 1,
    "settings": 1
  },
  "lastUpdated": "2025-10-10T..."
}
```

## Automatic Initialization

The database is automatically initialized with sample data when the application starts for the first time.

## Backup

To backup your data, simply copy the `database.json` file to a safe location.