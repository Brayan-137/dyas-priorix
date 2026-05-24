# Kubernetes Orchestration

Esta carpeta contiene los manifiestos de Kubernetes para desplegar el stack Priorix en un clúster.

## Recursos incluidos

- `namespace.yaml`: crea el namespace `priorix`.
- `app-secrets.yaml`: secretos de JWT, bases de datos y Redis.
- `core-configmap.yaml` y `gamification-configmap.yaml`: configuraciones de entorno que no son secretas.
- `nginx-configmap.yaml`: configuración del proxy Nginx que enruta `core` y `gamification`.
- `mysql-deployment.yaml`: despliegue de MySQL con PVC para `priorix_core`.
- `redis-deployment.yaml`: despliegue de Redis.
- `core-deployment.yaml`: despliegue del servicio `priorix-core`.
- `gamification-deployment.yaml`: despliegue del servicio `priorix-gamification`.
- `nginx-deployment.yaml`: despliegue de Nginx con servicio `LoadBalancer` para exponer los puertos 80 y 81.
- `kustomization.yaml`: manifiesto principal para aplicar todos los recursos.

## Despliegue

1. Reemplaza `ghcr.io/<your-github-owner>/...` en los archivos de despliegue por tu repositorio de imágenes.
2. Actualiza los valores sensibles en `k8s/app-secrets.yaml`.
3. Aplica los manifiestos:

```bash
kubectl apply -k k8s/
```

4. Comprueba el estado de los pods:

```bash
kubectl get pods -n priorix
kubectl get svc -n priorix
```

## Acceso

- `priorix-nginx` expone el tráfico en los puertos 80 y 81.
- Usa un `LoadBalancer` o `Ingress` adicional según tu clúster.
