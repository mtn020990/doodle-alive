// Backend base URL, e.g. 'https://doodle-alive-api.xxx.azurecontainerapps.io'.
// Empty = same site (the backend serves this page, as with scripts/run.ps1).
// scripts/deploy-azure.ps1 rewrites this file (in frontend/dist) from frontend/.env when it deploys.
window.DOODLE_CONFIG = { apiBaseUrl: '' };
