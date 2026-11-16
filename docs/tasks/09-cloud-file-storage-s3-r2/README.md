# Cloud File Storage (S3 / Cloudflare R2 / Spaces)

This folder contains the complete architecture, technical implementation plan, and provider setup guides for **Cloud File Storage & Ephemeral Persistence** across the Animal Bite Management System.

- **Status:** 🟢 Integrated & Live Verified (Cloudflare R2)
- **Issue:** ⚠️ Risk of file loss on redeploy — *Remediated*
- **Connected Provider:** Cloudflare R2 (`abtc-storage` bucket)

---

## Documents in this Folder

1. **[PLAN.md](./PLAN.md)**  
   *Complete technical implementation plan covering package installation (`league/flysystem-aws-s3-v3`), `config/filesystems.php`, public vs. private asset security, model accessors, service refactoring, zero-downtime migration command, and verification checklists.*

2. **[PROVIDER_SETUP_GUIDES.md](./PROVIDER_SETUP_GUIDES.md)**  
   *Step-by-step setup guides for creating buckets, API credentials, CORS policies, and Railway environment variables for Cloudflare R2, AWS S3, and DigitalOcean Spaces.*
