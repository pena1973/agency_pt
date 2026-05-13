# Agency PT

**Agency PT** is a real estate agency website with an integrated property catalog, map-based search, realtor admin panel, AI-assisted image generation, and multilingual property descriptions.

The project was created as a practical real estate platform where a realtor can not only publish property listings, but also improve visual presentation and content quality directly inside the admin panel.

The main idea is simple: a real estate agency website should not only show properties, but also help the realtor prepare better listings faster.

---

## Project Idea

Agency PT combines a public real estate catalog with an internal realtor workspace.

The public part allows visitors to browse properties for sale or rent, filter them by parameters, view objects on a map, open detailed property pages, calculate purchase-related taxes, and contact the realtor.

The admin part allows the realtor to add properties, upload photos, generate improved interior images with AI, create before/after GIFs, and generate multilingual property descriptions.

This makes the project more than a simple landing page. It is a small real estate business tool.

---

## Main Purpose

The purpose of the project is to help a real estate agency:

- publish properties faster;
- present listings more professionally;
- work with photos directly from a phone;
- improve interior visuals with AI;
- generate property descriptions in several languages;
- give buyers better information before contacting the realtor;
- manage media and listing content from one place.

The platform is especially useful for small agencies or individual realtors who need a modern website with practical automation features.

---

## Public Website Features

### Property Catalog

The website includes a catalog of real estate objects for:

- sale;
- rent.

Users can browse listings and filter properties by parameters.

The catalog is designed around the familiar real estate marketplace logic: the user can search by criteria and also work with the map, similar to the user experience of platforms like Idealista.

---

### Filtering by Parameters

The catalog can support filtering by property data, such as:

- sale or rent;
- property type;
- location;
- price;
- area;
- rooms;
- other listing parameters.

The goal is to help users quickly narrow down the catalog and find relevant properties.

---

### Map-Based Search

The project includes map-based property browsing.

Properties can be shown by coordinates, allowing users to understand where the object is located and compare listings geographically.

This is important for real estate because location is often one of the main decision factors.

---

### Individual Property Pages

Each property has an individual detail page.

A property card can include:

- property photos;
- main characteristics;
- detailed description;
- price;
- location;
- coordinates on the map;
- transport accessibility description;
- purchase tax calculator;
- contact block for reaching the realtor.

The goal is to give the buyer enough information to decide whether the property is interesting before contacting the agency.

---

### Google Map Coordinates

Each property can be connected to map coordinates.

This allows the property page to show the exact or approximate location on the map.

For buyers, this makes the listing more transparent and easier to evaluate.

---

### Purchase Tax Calculator

The property page includes a tax calculator for purchase scenarios.

This is useful for buyers because real estate purchase cost is not only the property price. Taxes and additional costs can affect the final decision.

The calculator helps users estimate the real financial context of the purchase.

---

### Transport Accessibility Description

The listing can include information about transport accessibility.

This helps the buyer understand:

- how convenient the location is;
- what infrastructure is nearby;
- whether the property fits daily life needs;
- how attractive the location may be for living or renting.

---

### Contact the Realtor

If the user likes a property, they can contact the realtor directly from the property page.

This keeps the lead flow close to the object and makes communication more focused.

---

## Realtor Admin Panel

The project includes an admin panel for the realtor.

The admin area is designed to manage property listings and media content without editing code.

---

### Property Creation and Editing

The realtor can add and fill in property data:

- title;
- price;
- sale/rent status;
- characteristics;
- address/location;
- coordinates;
- descriptions;
- media gallery;
- additional property details.

This allows the realtor to manage the website content independently.

---

### Mobile Photo Upload

In mobile mode, the realtor can open the admin panel from a phone, take a photo of the property, and upload it directly to the website.

New mobile photos are saved into a reserve/gallery area.

This is useful during real property visits: the realtor can photograph the object on site and immediately add media to the listing workflow.

---

### AI Image Processing

In desktop mode, uploaded property photos can be processed with artificial intelligence.

AI can generate improved interior variants, for example:

- furnish an empty room;
- visually renovate a space;
- change interior style;
- improve the presentation of a room;
- create a more attractive visual concept for buyers.

This feature is intended for real estate presentation and marketing.

Generated images can be reviewed before publication. If the realtor likes the result, it can be moved to the main gallery visible to clients.

---

### Main and Reserve Galleries

The media workflow separates photos into different states:

- uploaded / reserve photos;
- generated AI images;
- selected main gallery images.

This gives the realtor control over what is shown publicly.

Not every uploaded or generated image has to be immediately visible to clients.

---

### Before / After GIF Generation

The project supports generating GIFs from the original image and AI-generated result.

This makes it possible to show a visual transformation in motion: from the original property photo to the staged or renovated version.

Example:

```txt
http://165.22.80.127/uploads/generated/gifs/property-transition-1778623454520.gif
```

This feature can be useful for marketing, social media, client presentations, and demonstrating the potential of a property.

---

### Multilingual Property Descriptions

The website supports descriptions in 4 languages.

The realtor can write a property description in Russian and then generate translations automatically.

This is important for international real estate markets, where buyers may speak different languages.

The multilingual workflow helps reduce manual translation work and makes listings available to a broader audience.

---

## AI Features

Agency PT includes AI-assisted real estate content tools.

The project uses AI not as a decorative feature, but as a practical helper for the realtor.

AI can help with:

- image staging;
- virtual renovation;
- furnishing empty spaces;
- generating improved property visuals;
- translating descriptions;
- preparing listing content for several languages.

These features are especially useful when the original property photos are not visually strong enough or when the agency needs to prepare listings faster.

---

## Product Value

Agency PT gives a real estate agency several practical advantages:

- modern property catalog;
- map-based search;
- admin panel for content management;
- mobile photo upload directly from property visits;
- AI-generated interior staging;
- AI renovation previews;
- before/after GIF generation;
- multilingual listing descriptions;
- better property presentation;
- faster preparation of listings;
- more professional client-facing pages.

The project is designed around real agency workflow, not only around visual presentation.

---

## Technical Overview

Agency PT is a full-stack Next.js application.

It combines frontend pages, backend API routes, local database storage, file upload logic, media processing, AI integration, and admin functionality in one project.

The project demonstrates practical skills in:

- full-stack application development;
- real estate catalog architecture;
- admin panel workflows;
- media upload and storage;
- AI image generation integration;
- multilingual content generation;
- map-based interfaces;
- SQLite persistence;
- production file storage;
- deployment-aware architecture.

---

## Tech Stack

The project is built with:

- **Next.js**
- **React**
- **TypeScript**
- **SQLite**
- **better-sqlite3**
- **Drizzle ORM**
- **OpenAI API**
- **Leaflet**
- **React Leaflet**
- **Sharp**
- **Zod**
- **Tailwind CSS**
- **ESLint**

Main dependencies include:

- `next`
- `react`
- `react-dom`
- `openai`
- `better-sqlite3`
- `drizzle-orm`
- `leaflet`
- `react-leaflet`
- `sharp`
- `zod`
- `uuid`

---

## Technical Highlights

### Full-Stack Next.js Architecture

The project uses Next.js as a full-stack framework.

It includes:

- public pages;
- admin pages;
- backend API routes;
- property management logic;
- AI generation endpoints;
- media processing;
- database access;
- deployment-ready storage configuration.

---

### SQLite and Drizzle ORM

The project uses SQLite with Drizzle ORM.

This is a practical choice for a compact real estate website or MVP because it keeps infrastructure simple while still allowing structured data storage.

The database is used for property data, admin content, media records and listing information.

---

### Persistent Media Storage

Uploaded photos, AI-generated room images and generated GIFs are stored outside the deployment bundle.

The project supports environment-based media storage paths:

```bash
REAL_ESTATE_UPLOADS_PATH=/var/www/realestate/uploads
REAL_ESTATE_UPLOADS_PUBLIC_PATH=/uploads
DATABASE_PATH=/var/www/realestate/uploads/storage/app.db
```

New admin uploads are saved under:

```txt
photos/
```

AI-generated images are saved under:

```txt
generated/room-ai/
```

Generated GIFs are saved under:

```txt
generated/gifs/
```

The SQLite database is stored in:

```txt
storage/app.db
```

This protects uploaded media and database content from being overwritten during deployment.

---

### AI Image Generation Workflow

The system can take an original property photo and generate an improved visual version.

The workflow is:

1. Upload or select a source photo.
2. Send the photo to the AI generation process.
3. Generate an improved image.
4. Review the result.
5. Move approved images to the main public gallery.

This gives the realtor creative control and avoids automatically publishing every generated result.

---

### Image Processing

The project uses Sharp for image-related processing.

This can support practical media workflows such as resizing, optimization, file preparation, and generated asset handling.

---

### Map Integration

The project uses Leaflet and React Leaflet for map-based interfaces.

Map functionality supports property browsing and location-based user experience.

---

### Validation

The project uses Zod for schema validation.

This helps keep API input, forms, and backend data handling more reliable.

---

## Project Structure

```txt
agency_pt/
├── app/                    # Next.js app routes, pages and API logic
├── components/             # UI components
├── drizzle/                # Database schema and migrations
├── lib/                    # Shared logic, utilities and integrations
├── public/                 # Static assets
├── scripts/
│   └── db/                 # Database initialization and seed scripts
├── drizzle.config.ts       # Drizzle ORM configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Scripts and dependencies
├── postcss.config.mjs      # PostCSS configuration
└── tsconfig.json           # TypeScript configuration
```

---

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the application:

```txt
http://localhost:3000
```

Build the project:

```bash
npm run build
```

Run production build:

```bash
npm run start
```

Run linting:

```bash
npm run lint
```

---

## Database Commands

Initialize the database:

```bash
npm run db:init
```

Seed initial data:

```bash
npm run db:seed
```

Initialize and seed database:

```bash
npm run db:bootstrap
```

Generate Drizzle migrations:

```bash
npm run db:generate
```

Push schema changes:

```bash
npm run db:push
```

Open Drizzle Studio:

```bash
npm run db:studio
```

---

## Environment Variables

Example environment variables for production media storage:

```bash
REAL_ESTATE_UPLOADS_PATH=/var/www/realestate/uploads
REAL_ESTATE_UPLOADS_PUBLIC_PATH=/uploads
DATABASE_PATH=/var/www/realestate/uploads/storage/app.db
```

For AI features, the project also requires an OpenAI API key:

```bash
OPENAI_API_KEY=your_openai_api_key
```

Depending on deployment and map configuration, additional variables may be required.

---

## Deployment Notes

The project is designed so that uploaded media and the SQLite database can live outside the application deployment directory.

This is important because a new deployment should not overwrite:

- uploaded property photos;
- generated AI images;
- generated GIFs;
- SQLite database file.

In production, configure the web server to expose:

```txt
REAL_ESTATE_UPLOADS_PATH
```

at:

```txt
REAL_ESTATE_UPLOADS_PUBLIC_PATH
```

For example:

```txt
/var/www/realestate/uploads
```

can be publicly exposed as:

```txt
/uploads
```

---

## Business Use Cases

Agency PT can be used by:

- real estate agencies;
- individual realtors;
- property managers;
- rental agencies;
- agencies working with international buyers;
- small real estate businesses that need a modern website and admin panel.

Typical use cases:

- publish properties for sale;
- publish rental listings;
- manage listing photos;
- upload photos directly from a phone;
- improve property images with AI;
- create staged interiors;
- generate multilingual descriptions;
- display properties on a map;
- collect leads from interested buyers;
- show property purchase-related tax estimation.

---

## Current Status

The project is an MVP / product prototype.

Implemented or planned product areas include:

- property catalog;
- map-based browsing;
- individual property pages;
- admin panel;
- mobile photo upload;
- AI image generation;
- generated GIF workflow;
- multilingual descriptions;
- SQLite persistence;
- external media storage.

The project can be developed further into a full real estate SaaS or a custom website product for real estate agencies.

---

## Author

Created by **Natalia Barinova**.

Full-stack developer focused on React, Next.js, TypeScript, business automation, SaaS products, AI-assisted tools, real estate workflows and practical product development.

---

## License and Usage

This project is available for portfolio review and non-commercial use only.

Commercial use, copying, redistribution, resale, implementation for clients, or use inside a business process requires written permission from the author.

For commercial licensing or collaboration, contact:

```txt
ip.portu.me@gmail.com
```

