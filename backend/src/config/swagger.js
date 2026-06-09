const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Campus Safety & Environmental Monitoring API',
      version: '1.0.0',
      description:
        'REST API for the BTU Campus Safety Platform. Smartphones act as IoT nodes to detect crowd density, noise anomalies, restricted zone breaches, and unusual movement.\n\n**Auth:** Use POST /auth/login to get a JWT token, then click "Authorize" and enter `Bearer <token>`.',
      contact: {
        name: 'Bursa Technical University — Computer Engineering',
        email: 'admin@btu.edu.tr'
      }
    },
    servers: [
      { url: 'http://localhost:3001/api', description: 'Development server' }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' },
            username: { type: 'string', example: 'admin' },
            email: { type: 'string', example: 'admin@btu.edu.tr' },
            role: { type: 'string', enum: ['admin', 'operator', 'viewer'], example: 'admin' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Device: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            deviceId: { type: 'string', example: 'BTU-001' },
            name: { type: 'string', example: 'Library Entrance' },
            owner: { $ref: '#/components/schemas/User' },
            type: { type: 'string', example: 'smartphone' },
            location: {
              type: 'object',
              properties: {
                lat: { type: 'number', example: 40.2167 },
                lng: { type: 'number', example: 29.0833 }
              }
            },
            status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
            lastSeen: { type: 'string', format: 'date-time' },
            batteryLevel: { type: 'integer', minimum: 0, maximum: 100, example: 87 }
          }
        },
        SensorData: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            deviceId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' },
            timestamp: { type: 'string', format: 'date-time' },
            sensors: {
              type: 'object',
              properties: {
                accelerometer: {
                  type: 'object',
                  properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } }
                },
                gyroscope: {
                  type: 'object',
                  properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } }
                },
                gps: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number', example: 40.2167 },
                    lng: { type: 'number', example: 29.0833 },
                    accuracy: { type: 'number', example: 5 }
                  }
                },
                audioLevel: { type: 'number', minimum: 0, maximum: 130, example: 72.3 },
                networkStrength: { type: 'number', minimum: 0, maximum: 100, example: 85 }
              }
            },
            riskScore: { type: 'integer', minimum: 0, maximum: 100, example: 42 }
          }
        },
        Alarm: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            deviceId: { $ref: '#/components/schemas/Device' },
            type: {
              type: 'string',
              enum: ['CROWD_DENSITY', 'NOISE_ANOMALY', 'RESTRICTED_ZONE', 'UNUSUAL_MOVEMENT', 'DEVICE_OFFLINE'],
              example: 'NOISE_ANOMALY'
            },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'high' },
            message: { type: 'string', example: 'Sustained noise level 92dB detected for 12 consecutive readings' },
            timestamp: { type: 'string', format: 'date-time' },
            resolved: { type: 'boolean', example: false },
            resolvedBy: { $ref: '#/components/schemas/User' },
            resolvedAt: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' }
          }
        }
      }
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication — register, login, current user' },
      { name: 'Devices', description: 'Device registration and management' },
      { name: 'Sensors', description: 'Sensor data ingestion and retrieval' },
      { name: 'Alarms', description: 'Anomaly alarms management' }
    ],
    paths: {
      // ── AUTH ──────────────────────────────────────────────────────────
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'email', 'password'],
                  properties: {
                    username: { type: 'string', example: 'newuser' },
                    email: { type: 'string', example: 'user@btu.edu.tr' },
                    password: { type: 'string', example: 'secret123' },
                    role: { type: 'string', enum: ['admin', 'operator', 'viewer'], example: 'viewer' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'User created, returns JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
            400: { description: 'Validation error or duplicate user', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and receive a JWT token',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'admin@btu.edu.tr' },
                    password: { type: 'string', example: 'admin123' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Login successful, returns token + user' },
            401: { description: 'Invalid credentials' }
          }
        }
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current authenticated user',
          responses: {
            200: { description: 'Current user profile' },
            401: { description: 'Not authenticated' }
          }
        }
      },
      // ── DEVICES ───────────────────────────────────────────────────────
      '/devices': {
        get: {
          tags: ['Devices'],
          summary: 'List all devices (admin: all, user: own)',
          responses: { 200: { description: 'Array of devices' } }
        },
        post: {
          tags: ['Devices'],
          summary: 'Register a new device',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['deviceId', 'name'],
                  properties: {
                    deviceId: { type: 'string', example: 'BTU-009' },
                    name: { type: 'string', example: 'New Sensor Node' },
                    location: {
                      type: 'object',
                      properties: { lat: { type: 'number' }, lng: { type: 'number' } }
                    }
                  }
                }
              }
            }
          },
          responses: { 201: { description: 'Device created' }, 400: { description: 'Validation error or duplicate deviceId' } }
        }
      },
      '/devices/{id}': {
        get: {
          tags: ['Devices'],
          summary: 'Get a specific device',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Device details' }, 404: { description: 'Not found' } }
        },
        put: {
          tags: ['Devices'],
          summary: 'Update a device',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    batteryLevel: { type: 'integer', minimum: 0, maximum: 100 },
                    location: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Updated device' }, 403: { description: 'Access denied' } }
        },
        delete: {
          tags: ['Devices'],
          summary: 'Delete a device (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Device deleted' }, 403: { description: 'Admin only' } }
        }
      },
      '/devices/{id}/status': {
        get: {
          tags: ['Devices'],
          summary: 'Get device status (status, lastSeen, battery)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Device status info' } }
        }
      },
      // ── SENSORS ───────────────────────────────────────────────────────
      '/sensors/data': {
        post: {
          tags: ['Sensors'],
          summary: 'Submit sensor reading (triggers anomaly detection)',
          description: 'Mobile devices / simulator post here every 2s. Anomaly detection runs synchronously and returns triggered alarms.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['deviceId', 'sensors'],
                  properties: {
                    deviceId: { type: 'string', example: 'BTU-001' },
                    batteryLevel: { type: 'integer', example: 85 },
                    sensors: {
                      type: 'object',
                      required: ['audioLevel'],
                      properties: {
                        accelerometer: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
                        gyroscope: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
                        gps: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' }, accuracy: { type: 'number' } } },
                        audioLevel: { type: 'number', minimum: 0, maximum: 130, example: 72.5 },
                        networkStrength: { type: 'number', minimum: 0, maximum: 100, example: 80 }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Data stored. Returns sensorData, triggered alarms, and riskScore.' },
            404: { description: 'Device not registered' }
          }
        },
        get: {
          tags: ['Sensors'],
          summary: 'Query historical sensor data',
          parameters: [
            { name: 'deviceId', in: 'query', schema: { type: 'string' }, description: 'Filter by deviceId string (e.g. BTU-001)' },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'ISO8601 start date' },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'ISO8601 end date' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 1000 } }
          ],
          responses: { 200: { description: 'Array of sensor readings' } }
        }
      },
      '/sensors/latest/{deviceId}': {
        get: {
          tags: ['Sensors'],
          summary: 'Get the most recent reading for a device',
          parameters: [{ name: 'deviceId', in: 'path', required: true, schema: { type: 'string' }, example: 'BTU-001' }],
          responses: { 200: { description: 'Latest sensor document' }, 404: { description: 'No data found' } }
        }
      },
      '/sensors/stats/{deviceId}': {
        get: {
          tags: ['Sensors'],
          summary: 'Get 24h statistics for a device',
          parameters: [{ name: 'deviceId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Stats: totalReadings, last24h, avgAudioLevel, avgRiskScore, maxRiskScore' } }
        }
      },
      // ── ALARMS ────────────────────────────────────────────────────────
      '/alarms': {
        get: {
          tags: ['Alarms'],
          summary: 'List alarms with optional filters',
          parameters: [
            { name: 'severity', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['CROWD_DENSITY', 'NOISE_ANOMALY', 'RESTRICTED_ZONE', 'UNUSUAL_MOVEMENT', 'DEVICE_OFFLINE'] } },
            { name: 'resolved', in: 'query', schema: { type: 'boolean' }, description: 'true / false' },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 500 } }
          ],
          responses: { 200: { description: 'Array of alarm objects' } }
        }
      },
      '/alarms/stats': {
        get: {
          tags: ['Alarms'],
          summary: 'Alarm statistics (counts by severity, type, hourly)',
          responses: { 200: { description: 'Stats: total, todayCount, unresolvedCount, bySeverity[], byType[], hourlyData[]' } }
        }
      },
      '/alarms/{id}/resolve': {
        post: {
          tags: ['Alarms'],
          summary: 'Mark alarm as resolved (admin / operator only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Alarm marked resolved' },
            400: { description: 'Already resolved' },
            403: { description: 'Insufficient permissions' },
            404: { description: 'Alarm not found' }
          }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
