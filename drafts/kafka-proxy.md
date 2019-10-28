---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafkaproxy
spec:
  selector:
    matchLabels:
      app: kafkaproxy
  replicas: 1
  template:
    metadata:
      labels:
        app: kafkaproxy
    spec:
      containers:
        - name: kafka-proxy
          image: grepplabs/kafka-proxy:latest
          args:
            - "server"
            - "--log-format=json"
            - "--log-level=debug"
            - "--bootstrap-server-mapping=kafka-xxx.aivencloud.com:12835,localhost:32400,localhost:32400"
            - "--bootstrap-server-mapping=172.18.0.11:12835,localhost:32401,localhost:32401"
            - "--bootstrap-server-mapping=172.18.0.64:12835,localhost:32402,localhost:32402"
            - "--bootstrap-server-mapping=172.18.0.65:12835,localhost:32403,localhost:32403"
						- "--dynamic-listeners-disable"
            - "--tls-enable"
            - "--tls-ca-chain-cert-file=/var/run/secret/kafka-ca-chain-certificate/ca.pem"
            - "--tls-client-cert-file=/var/run/secret/kafka-client-certificate/service.crt"
            - "--tls-client-key-file=/var/run/secret/kafka-client-key/service.key"
          volumeMounts:
            - name: "tls-ca-chain-certificate"
              mountPath: "/var/run/secret/kafka-ca-chain-certificate"
            - name: "tls-client-cert-file"
              mountPath: "/var/run/secret/kafka-client-certificate"
            - name: "tls-client-key-file"
              mountPath: "/var/run/secret/kafka-client-key"
          ports:
            - name: metrics
              containerPort: 9080
            - name: kafka-bootstrap
              containerPort: 32400
            - name: kafka1
              containerPort: 32401
            - name: kafka2
              containerPort: 32402
            - name: kafka3
              containerPort: 32403
          livenessProbe:
            httpGet:
              path: /health
              port: 9080
            initialDelaySeconds: 5
            periodSeconds: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 9080
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
            successThreshold: 2
            failureThreshold: 5
      volumes:
        - name: tls-ca-chain-certificate
          secret:
            secretName: tls-ca-chain-certificate
        - name: tls-client-cert-file
          secret:
            secretName: tls-client-cert-file
        - name: tls-client-key-file
          secret:
            secretName: tls-client-key-file

---
apiVersion: v1
kind: Secret
metadata:
  name: tls-ca-chain-certificate
type: Opaque
stringData:
  ca.pem: |-
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
---
apiVersion: v1
kind: Secret
metadata:
  name: tls-client-cert-file
type: Opaque
stringData:
  service.crt: |-
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
---
apiVersion: v1
kind: Secret
metadata:
  name: tls-client-key-file
type: Opaque
stringData:
  service.key: |-
    -----BEGIN PRIVATE KEY-----
    ...
    -----END PRIVATE KEY-----



$ oc port-forward kafkaproxy-55b598f656-6f2d4 32400 32401 32402 32403
Forwarding from 127.0.0.1:32400 -> 32400
Forwarding from [::1]:32400 -> 32400
Forwarding from 127.0.0.1:32401 -> 32401
Forwarding from [::1]:32401 -> 32401
Forwarding from 127.0.0.1:32402 -> 32402
Forwarding from [::1]:32402 -> 32402
Forwarding from 127.0.0.1:32403 -> 32403
Forwarding from [::1]:32403 -> 32403
Handling connection for 32402
Handling connection for 32401
Handling connection for 32401
Handling connection for 32403
Handling connection for 32403
Handling connection for 32402

Dans conduktor, plus de certificats, juste du plain.
