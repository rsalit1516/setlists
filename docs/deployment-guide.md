# Azure Deployment Guide

## Architecture Overview

The setlist management system uses a modern Azure architecture optimized for cost and performance:

- **Frontend**: Angular 18 hosted on Azure Static Web Apps
- **Backend**: .NET 9 Minimal API on Azure Functions (consumption plan)
- **Database**: Azure SQL Database (Basic tier)
- **Authentication**: Azure AD B2C
- **Storage**: Azure Storage Account (for static assets)
- **CI/CD**: GitHub Actions

## Cost Analysis

### Estimated Monthly Costs (USD)

| Service               | Tier/Plan          | Estimated Cost |
| --------------------- | ------------------ | -------------- |
| Azure Static Web Apps | Free tier          | $0             |
| Azure Functions       | Consumption plan   | $1-3           |
| Azure SQL Database    | Basic (5 DTU)      | $5             |
| Azure AD B2C          | First 50K MAU free | $0             |
| Azure Storage         | Standard LRS       | $1             |
| **Total**             |                    | **$7-9/month** |

### Cost Optimization Strategies

- Use consumption-based pricing for Functions
- Leverage free tiers where possible
- Monitor usage with Azure Cost Management
- Set up billing alerts at $10 threshold

## Prerequisites

### Azure Resources Required

1. Azure Subscription with Owner/Contributor access
2. Azure AD B2C tenant (or existing Azure AD)
3. GitHub repository with code
4. Domain name (optional, can use provided domains)

### Development Tools

- Azure CLI (latest version)
- .NET 9 SDK
- Node.js 18+ and npm
- Angular CLI 18+
- Visual Studio Code or Visual Studio 2022

## Step-by-Step Deployment

### 1. Azure AD B2C Setup

#### Create B2C Tenant

```bash
# Create resource group
az group create --name rg-setlist-prod --location eastus

# Create B2C tenant (via Azure Portal)
# Navigate to: Azure Portal > Create a resource > Azure Active Directory B2C
```

#### Configure User Flows

1. Navigate to Azure AD B2C in Azure Portal
2. Create Sign-up/Sign-in user flow
3. Configure attributes: Display Name, Email Address
4. Note the tenant name and policy names

#### Register Application

```bash
# Register the Angular SPA
az ad app create --display-name "Setlist Frontend" \
  --sign-in-audience AzureADandPersonalMicrosoftAccount \
  --spa-redirect-uris "https://localhost:4200/auth/callback" \
  --web-redirect-uris "https://{your-static-app}.azurestaticapps.net/auth/callback"

# Register the API
az ad app create --display-name "Setlist API" \
  --sign-in-audience AzureADandPersonalMicrosoftAccount \
  --identifier-uris "api://setlist-api"
```

### 2. Database Setup

#### Create Azure SQL Database

```bash
# Create SQL Server
az sql server create \
  --name sql-setlist-prod \
  --resource-group rg-setlist-prod \
  --location eastus \
  --admin-user setlistadmin \
  --admin-password {secure-password}

# Create database
az sql db create \
  --resource-group rg-setlist-prod \
  --server sql-setlist-prod \
  --name setlistdb \
  --service-objective Basic \
  --backup-storage-redundancy Local

# Configure firewall
az sql server firewall-rule create \
  --resource-group rg-setlist-prod \
  --server sql-setlist-prod \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

#### Run Database Migrations

```bash
# From the API project directory
dotnet ef database update --connection-string "{azure-sql-connection-string}"
```

### 3. Backend API Deployment (Azure Functions)

#### Create Function App

```bash
# Create storage account for Functions
az storage account create \
  --name stsetlistprod \
  --resource-group rg-setlist-prod \
  --location eastus \
  --sku Standard_LRS

# Create Function App
az functionapp create \
  --resource-group rg-setlist-prod \
  --consumption-plan-location eastus \
  --runtime dotnet-isolated \
  --runtime-version 8 \
  --functions-version 4 \
  --name func-setlist-prod \
  --storage-account stsetlistprod
```

#### Configure App Settings

```bash
# Set connection strings and configuration
az functionapp config appsettings set \
  --name func-setlist-prod \
  --resource-group rg-setlist-prod \
  --settings \
    "ConnectionStrings__DefaultConnection={azure-sql-connection-string}" \
    "AzureAdB2C__Domain={tenant-name}.onmicrosoft.com" \
    "AzureAdB2C__TenantId={tenant-id}" \
    "AzureAdB2C__ClientId={api-client-id}" \
    "CORS__AllowedOrigins=https://{static-app-name}.azurestaticapps.net"
```

#### Deploy API Code

```bash
# Publish the Function App
func azure functionapp publish func-setlist-prod
```

### 4. Frontend Deployment (Static Web Apps)

#### Create Static Web App

```bash
az staticwebapp create \
  --name swa-setlist-prod \
  --resource-group rg-setlist-prod \
  --source https://github.com/{username}/setlist \
  --location eastus2 \
  --branch main \
  --app-location "/frontend" \
  --output-location "dist/setlist"
```

#### Configure Environment Variables

```bash
# Set production configuration
az staticwebapp appsettings set \
  --name swa-setlist-prod \
  --setting-names \
    "API_BASE_URL=https://func-setlist-prod.azurewebsites.net/api" \
    "B2C_TENANT_NAME={tenant-name}" \
    "B2C_CLIENT_ID={frontend-client-id}" \
    "B2C_POLICY_NAME=B2C_1_SignUpSignIn"
```

### 5. CI/CD Pipeline Setup

#### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: "9.0.x"

      - name: Restore dependencies
        run: dotnet restore ./src/api/

      - name: Build
        run: dotnet build ./src/api/ --no-restore

      - name: Test
        run: dotnet test ./src/api/ --no-build --verbosity normal

  deploy-api:
    needs: build-and-test-api
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: "9.0.x"

      - name: Build and Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: func-setlist-prod
          package: "./src/api"
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}

  build-and-deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci
        working-directory: ./frontend

      - name: Build Angular app
        run: npm run build:prod
        working-directory: ./frontend

      - name: Deploy to Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/frontend"
          output_location: "dist/setlist"
```

### 6. Domain and SSL Configuration

#### Custom Domain (Optional)

```bash
# Add custom domain to Static Web App
az staticwebapp hostname set \
  --name swa-setlist-prod \
  --hostname setlist.yourdomain.com

# SSL certificates are automatically managed by Azure
```

## Security Configuration

### Network Security

- Enable Azure SQL firewall rules
- Configure Function App IP restrictions if needed
- Use managed identities where possible

### Data Protection

- Enable Azure SQL encryption at rest (default)
- Configure backup retention policies
- Set up Azure Key Vault for sensitive configuration

### Monitoring and Logging

```bash
# Enable Application Insights
az monitor app-insights component create \
  --app setlist-insights \
  --location eastus \
  --resource-group rg-setlist-prod

# Configure Function App to use Application Insights
az functionapp config appsettings set \
  --name func-setlist-prod \
  --resource-group rg-setlist-prod \
  --settings "APPLICATIONINSIGHTS_CONNECTION_STRING={connection-string}"
```

## Environment Management

### Development Environment

- Local development with Azure SQL LocalDB
- Azure AD B2C test tenant
- Local Angular dev server and .NET API

### Staging Environment (Optional)

- Separate resource group: `rg-setlist-staging`
- Deployment slots for Function Apps
- Separate B2C environment

### Production Environment

- All services in `rg-setlist-prod`
- Production B2C tenant
- Monitoring and alerting enabled

## Backup and Disaster Recovery

### Database Backups

- Automated daily backups (7-day retention)
- Point-in-time restore capability
- Consider geo-redundant backup for production

### Application Recovery

- Source code in GitHub (primary backup)
- Infrastructure as Code for quick re-deployment
- Configuration stored in Azure Key Vault

## Monitoring and Maintenance

### Health Monitoring

- Application Insights dashboards
- Azure Monitor alerts for failures
- Custom health check endpoints

### Performance Monitoring

- Database performance metrics
- Function execution metrics
- Static Web App CDN performance

### Cost Monitoring

- Azure Cost Management alerts
- Monthly cost reviews
- Resource utilization analysis

## Troubleshooting Common Issues

### Authentication Issues

1. Verify B2C application registration
2. Check redirect URIs match exactly
3. Validate token issuer and audience

### Database Connection Issues

1. Verify connection string format
2. Check firewall rules
3. Confirm authentication method

### CORS Issues

1. Verify allowed origins in Function App
2. Check preflight request handling
3. Validate header configurations

## Production Readiness Checklist

- [ ] All services deployed and configured
- [ ] Custom domain configured (if required)
- [ ] SSL certificates active
- [ ] Authentication working end-to-end
- [ ] Database migrations applied
- [ ] Monitoring and alerting configured
- [ ] Backup strategies in place
- [ ] CI/CD pipeline functional
- [ ] Security review completed
- [ ] Performance testing completed
- [ ] Documentation updated
- [ ] Team training completed

## Support and Maintenance

### Regular Maintenance Tasks

- Monthly cost reviews
- Quarterly security updates
- Annual disaster recovery testing
- Dependency updates (quarterly)

### Emergency Procedures

- Service outage response plan
- Data breach response plan
- Rollback procedures
- Emergency contact information
