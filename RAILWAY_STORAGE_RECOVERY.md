# Railway image recovery

## Confirmed diagnosis (2026-10-18)

The live vehicle API returns Railway HTTPS storage URLs. All 15 distinct vehicle/profile image URLs inspected returned HTTP 404. The corresponding old photos remain in this checkout under `backend/storage/app/public`. This requires backend file recovery; rebuilding the phone app alone cannot fix the missing server files.

## Changes ready for deployment

- The backend Docker build preserves historical public vehicle, profile and payment QR image folders under `resources/legacy-public`, outside a potential storage volume mount. No verification documents or chat attachments enter that snapshot.
- On startup, after migrations, `php artisan storage:recover-public` restores missing public images from database backups first, fills remaining missing files from the packaged originals, then backs existing public images into `stored_files`. Database backups take precedence over older packaged copies.
- Existing files and database backups are not overwritten by the recovery command. It is safe to rerun. Private verification documents are excluded and continue using signed document access.
- The existing `/storage/{path}` route also restores backed-up files on demand. Existing upload middleware backs up new uploads.

## Step-by-step production fix

These steps are for the existing PHP/Apache Dockerfile, whose application directory is /var/www/html. Do not substitute Railway's generic /app example for this project's Docker path.

1. Open your Railway project and select the Laravel backend service, then select the production environment. Do not attach the uploads volume to the PostgreSQL service; the backend writes the uploads.
2. Before changing a mount or redeploying, preserve any recent production-only uploads that are not in this checkout or in stored_files. Use Railway SSH/file download if needed. A new empty volume does not automatically import the old container directory. If the backend already has a volume, inspect its mount path and back it up rather than replacing/deleting it. All 15 historical missing images inspected have originals locally.
3. Publish the reviewed backend changes to the branch connected to Railway. Include the new app/Console/Commands/RecoverPublicStorage.php, Dockerfile and docker/entrypoint.sh changes, the stored_files migration, and the tracked public photo folders. New/untracked PHP files must be included in the deployment too. Keep the existing .dockerignore exclusions for private verification documents.
4. In backend service Settings, confirm the service uses the backend folder as its root and builds this Dockerfile. Keep the Docker entrypoint; do not override startup with a command that skips it. The image recovery command runs at container startup after migrations, not during image build or a Railway pre-deploy step.
5. Under backend Variables, set APP_URL=https://ride4rent-production.up.railway.app and RUN_MIGRATIONS=true. Retain the existing database credentials and APP_KEY. Do not run a fresh migration or reseed to repair images.
6. On the project canvas, right-click and choose the volume creation option, or use Ctrl+K and search for volume creation. Connect the new volume to the backend service. Set the mount path to exactly /var/www/html/storage/app. This includes both public images and private documents. The Docker build preserves known public originals outside the mount so they remain recoverable after mounting it.
7. Apply the pending changes/deploy the latest backend code. In deployment logs, look for Public images: N backed up, N restored from database, N restored from packaged originals. A second boot can legitimately show zero restored. A recovery-failed warning needs investigation before considering recovery complete.
8. Verify a known image in a browser: https://ride4rent-production.up.railway.app/storage/vehicles/NgjBfESpFvEKvQKd1urqnE5ODqSp2z23OXow93oA.jpg . Expect the actual photo, HTTP 200, and an image content type. Then check the same vehicle in the release app. Existing image URLs remain valid, so no mobile rebuild is required for file recovery alone.
9. Upload a NEW test vehicle/profile photo through the app and note its exact URL. Redeploy the backend once. Verify both the old photo and the new upload still display. Testing a new upload proves the volume works; testing only bundled historical images does not.
10. Open the backend service Backups tab and configure daily volume backups. Also configure backups for PostgreSQL, which holds image metadata and stored_files recovery data. Keep the uploads volume attached across deployments; do not delete or remount it as part of routine releases.

## If automatic recovery did not complete

Install/login/link the Railway CLI from Windows PowerShell:

~~~powershell
npm i -g @railway/cli
railway login
cd C:\capstone\Ride4Rent\backend
railway link
railway service
railway ssh
~~~

Choose the existing project, production environment and Laravel backend when prompted. The last command opens the RUNNING CONTAINER. Do not substitute railway run or railway shell: those run locally with environment variables rather than inside the deployed filesystem.

Inside the Railway container, run:

~~~sh
cd /var/www/html
php artisan config:clear
php artisan migrate --force
php artisan storage:link
php artisan storage:recover-public
ls -l storage/app/public/vehicles/NgjBfESpFvEKvQKd1urqnE5ODqSp2z23OXow93oA.jpg
~~~

If storage:link says the link already exists, continue. If it points somewhere incorrect, inspect readlink public/storage before changing it. If the recover-public command is missing, the new backend code has not been deployed. If stored_files is missing, the migration did not run. If the photo is still missing and the packaged recovery folders are absent, the Docker build did not include the originals or used the wrong build context. Upload the original files through the app or into the correct public storage subfolder without renaming their database paths, then rerun recovery.

If a file exists but the URL still returns 404, check that public/storage resolves to /var/www/html/storage/app/public and that the deployed routes include storage/{path}. If the URL works in a browser but the phone stays blank, check the actual URL returned by /api/v1/vehicles and the release app's API configuration. Localhost/laptop addresses cannot serve release users. Current preview/production EAS profiles already use the Railway API.

Photos with no original file and no database backup must be uploaded again. A persistent volume prevents future container replacement from removing uploads; it cannot recreate bytes that were already lost.

No production database mutation, volume provisioning, or deployment was performed by this task.

Sources: https://docs.railway.com/volumes , https://docs.railway.com/volumes/backups , https://docs.railway.com/cli , https://docs.railway.com/cli/ssh . Railway mounts volumes at runtime rather than build/pre-deploy time; that is why this project's recovery runs in the entrypoint.

## Pickup maps

The renter pickup screen uses foreground GPS and the OSRM public routing endpoint to draw a road route, distance, and estimated drive time. GPS updates refresh the route. Location permission and an internet connection are required. The public routing service can be unavailable; the app displays a failure rather than drawing a fabricated straight-line route. A production routing service with a service guarantee can replace the endpoint later.

The province polygon comes from NAMRIA / PSA / OCHA via geoBoundaries; see `backend/resources/geo/README.md` for source and license. The province border is a passive, unfilled line. Dragging, tapping and zooming are unrestricted to keep the map responsive. There is no outside mask, snap-back, or pan/zoom lock. An outside selection shows a warning and cannot be confirmed or saved. Old saved outside locations are discarded. Map documents stay stable during selection/address/layer updates. Pickup confirmation and vehicle write validation reject locations outside the polygon, including Occidental Mindoro. The app also rejects returned pickup routes with coordinates outside it. Directions opened in an external map app are controlled by that external app; Ride4Rent cannot enforce changes subsequently made there.

Physical checks: open a vehicle pickup map inside Oriental Mindoro, allow GPS, verify both pins and a road route; move and confirm route updates; deny GPS permission and verify an explanatory message; try an outside pickup pin and confirm rejection; verify border visibility on pickup, current-location and garage-picker maps.
