# 📊 Monitoring & Health Check Configuration

> Production monitoring setup guide

---

## 🏥 Health Check Endpoint

Add this to your Express app:

```typescript
// src/app/routes/health.ts
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import redis from 'redis';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: string;
      latency: number;
    };
    redis: {
      status: string;
      latency: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const memUsage = process.memoryUsage();

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: { status: 'unknown', latency: 0 },
      redis: { status: 'unknown', latency: 0 },
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
    },
  };

  // Check MongoDB
  try {
    const dbStartTime = Date.now();
    const adminDb = mongoose.connection.db?.admin();
    if (adminDb) {
      await adminDb.ping();
      health.checks.database = {
        status: 'healthy',
        latency: Date.now() - dbStartTime,
      };
    }
  } catch (error) {
    health.checks.database = {
      status: 'unhealthy',
      latency: Date.now() - startTime,
    };
    health.status = 'degraded';
  }

  // Check Redis
  try {
    const redisStartTime = Date.now();
    const redisClient = redis.createClient();
    await redisClient.connect();
    await redisClient.ping();
    await redisClient.quit();
    health.checks.redis = {
      status: 'healthy',
      latency: Date.now() - redisStartTime,
    };
  } catch (error) {
    health.checks.redis = {
      status: 'unhealthy',
      latency: Date.now() - startTime,
    };
    health.status = 'degraded';
  }

  // Memory warning
  if (health.checks.memory.percentage > 85) {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
```

---

## 📈 Metrics Collection

Setup Prometheus metrics:

```typescript
// src/app/utils/metrics.ts
import prometheus from 'prom-client';

// Create metrics
export const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

export const databaseQueryDuration = new prometheus.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

export const cacheHitRate = new prometheus.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
});

export const errorCounter = new prometheus.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'endpoint'],
});

// Metrics endpoint
export const metricsRouter = Router();
metricsRouter.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

---

## 🔍 Application Logging

Setup structured logging:

```typescript
// src/app/utils/logger.ts
import winston from 'winston';
import 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'fam-sched-api' },
  transports: [
    // Error logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '100m',
      maxDays: '30d',
      compress: true,
    }),
    // All logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxDays: '30d',
      compress: true,
    }),
  ],
});

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`;
        }),
      ),
    }),
  );
}

export default logger;
```

---

## 🚨 Alert Rules

```yaml
# prometheus-alerts.yml
groups:
  - name: fam_sched_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value }} errors per second'

      # High memory usage
      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
        for: 5m
        annotations:
          summary: 'High memory usage'
          description: 'Memory usage is {{ $value | humanizePercentage }}'

      # Slow database queries
      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, database_query_duration_seconds_bucket) > 1
        for: 5m
        annotations:
          summary: 'Slow database queries detected'
          description: '95th percentile query time is {{ $value }}s'

      # High API response time
      - alert: HighAPIResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 2
        for: 5m
        annotations:
          summary: 'High API response time'
          description: '95th percentile response time is {{ $value }}s'

      # Service down
      - alert: ServiceDown
        expr: up{job="fam_sched_api"} == 0
        for: 1m
        annotations:
          summary: 'Service is down'
          description: 'Family Schedule API is not responding'

      # Disk space low
      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
        for: 5m
        annotations:
          summary: 'Low disk space'
          description: 'Only {{ $value | humanizePercentage }} disk space remaining'
```

---

## 📱 Alert Channels

### PagerDuty Integration

```typescript
// src/app/utils/alerting.ts
import axios from 'axios';

const PAGERDUTY_INTEGRATION_URL = process.env.PAGERDUTY_INTEGRATION_URL;

export async function triggerPagerDutyAlert(
  severity: 'critical' | 'error' | 'warning',
  title: string,
  description: string,
  details?: any,
) {
  try {
    await axios.post(PAGERDUTY_INTEGRATION_URL, {
      routing_key: process.env.PAGERDUTY_ROUTING_KEY,
      event_action: 'trigger',
      payload: {
        summary: title,
        severity,
        source: 'fam_sched_api',
        custom_details: {
          description,
          timestamp: new Date().toISOString(),
          ...details,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send PagerDuty alert:', error);
  }
}
```

### Slack Integration

```typescript
export async function sendSlackAlert(
  channel: string,
  title: string,
  message: string,
  severity: 'critical' | 'error' | 'warning' | 'info',
) {
  const colors = {
    critical: '#FF0000',
    error: '#FF6600',
    warning: '#FFAA00',
    info: '#0099FF',
  };

  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      channel,
      attachments: [
        {
          color: colors[severity],
          title,
          text: message,
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    });
  } catch (error) {
    logger.error('Failed to send Slack alert:', error);
  }
}
```

---

## 🔄 APM Integration

### Datadog Setup

```typescript
// src/app/config/datadog.ts
import tracer from 'dd-trace';

tracer.init({
  env: process.env.NODE_ENV,
  service: 'fam_sched_api',
  version: process.env.APP_VERSION,
  logInjection: true,
  analytics: true,
});

tracer.use('express', {
  measured: true,
});

tracer.use('mongodb-core', {
  measured: true,
});

tracer.use('redis', {
  measured: true,
});

export default tracer;
```

### New Relic Setup

```typescript
// newrelic.js
module.exports = {
  app_name: ['fam_sched_api'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info',
  },
  distributed_tracing: {
    enabled: true,
  },
  transaction_tracer: {
    record_sql: 'raw',
  },
};
```

---

## 📊 Dashboard Queries

### Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "Family Schedule API - Production",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(errors_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Database Query Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, database_query_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "container_memory_usage_bytes"
          }
        ]
      }
    ]
  }
}
```

---

## 🔐 Log Aggregation (ELK Stack)

```yaml
# docker-compose.yml - Add to production setup
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
  environment:
    - discovery.type=single-node
    - 'ES_JAVA_OPTS=-Xms512m -Xmx512m'
  ports:
    - '9200:9200'
  volumes:
    - elasticsearch_data:/usr/share/elasticsearch/data

kibana:
  image: docker.elastic.co/kibana/kibana:8.0.0
  ports:
    - '5601:5601'
  depends_on:
    - elasticsearch

filebeat:
  image: docker.elastic.co/beats/filebeat:8.0.0
  volumes:
    - ./logs:/var/log/app:ro
    - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
  depends_on:
    - elasticsearch
```

---

## ⏰ Scheduled Reports

```typescript
// src/app/job/dailyReport.ts
import cron from 'node-cron';
import axios from 'axios';

// Daily report at 8 AM
cron.schedule('0 8 * * *', async () => {
  const report = {
    date: new Date().toISOString().split('T')[0],
    metrics: {
      requests: await getRequestCount(),
      errors: await getErrorCount(),
      avgResponseTime: await getAvgResponseTime(),
      uptime: process.uptime(),
    },
  };

  // Send to Slack
  await sendSlackAlert(
    '#alerts',
    'Daily API Report',
    JSON.stringify(report, null, 2),
    'info',
  );
});
```

---

## 🧪 Synthetic Monitoring

```typescript
// src/app/monitoring/synthetic.ts
import axios from 'axios';

async function runSyntheticCheck() {
  const checks = [
    {
      name: 'Health Check',
      url: `${process.env.BACKEND_URL}/api/v1/health`,
    },
    {
      name: 'Auth Endpoint',
      url: `${process.env.BACKEND_URL}/api/v1/auth/login`,
      method: 'POST',
    },
    {
      name: 'Events List',
      url: `${process.env.BACKEND_URL}/api/v1/events`,
      headers: { Authorization: `Bearer ${SYNTHETIC_TOKEN}` },
    },
  ];

  for (const check of checks) {
    try {
      const response = await axios({
        method: check.method || 'GET',
        url: check.url,
        headers: check.headers,
        timeout: 5000,
      });

      logger.info(`✅ ${check.name} passed`);
    } catch (error) {
      logger.error(`❌ ${check.name} failed:`, error.message);
      await triggerPagerDutyAlert(
        'warning',
        `Synthetic Check Failed: ${check.name}`,
        error.message,
      );
    }
  }
}

// Run every 5 minutes
cron.schedule('*/5 * * * *', runSyntheticCheck);
```

---

## 📋 Monitoring Checklist

- [ ] Prometheus configured
- [ ] Grafana dashboards created
- [ ] Alert rules defined
- [ ] PagerDuty integration active
- [ ] Slack integration active
- [ ] ELK stack deployed
- [ ] Health check endpoint working
- [ ] APM tool configured
- [ ] Log retention policy set
- [ ] Backup monitoring enabled
- [ ] Database monitoring active
- [ ] Cache monitoring active
- [ ] Error tracking (Sentry) enabled
- [ ] Uptime monitoring active
- [ ] Daily reports scheduled
- [ ] Synthetic checks running
