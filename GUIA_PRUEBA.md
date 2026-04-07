# 🧪 Guía de Prueba - Dashboard RiwiCall

## Problemas Resueltos y Cómo Probarlos

---

## ✅ **Problema 1: Descarga CSV no funcionaba**

### ¿Qué se arregló?
Los botones "Descargar Candidatos en CSV" ahora generan un archivo real.

### Cómo probar:
1. Navega a: `#/reportes` (Reportes y Descargas)
2. En la tarjeta "Candidatos", haz clic en el botón **"CSV"**
3. ✅ Se debe descargar un archivo `candidatos_YYYY-MM-DD.csv`
4. Abre el archivo en Excel o un editor de texto
5. Verifica que contiene los datos de candidatos con headers

### Archivos descargables:
- `candidatos_YYYY-MM-DD.csv`
- `llamadas_YYYY-MM-DD.csv`
- `eventos_YYYY-MM-DD.csv`
- Mismo nombre pero `.json` para descargas JSON

---

## ✅ **Problema 2: Vista de Analítica se veía fea**

### ¿Qué se arregló?
- CSS incorrecto fue corregido
- Los valores de estadísticas ahora son dinámicos

### Cómo probar:
1. Navega a: `#/analitica` o `#/analytics`
2. Verifica que se vea correctamente sin estilos rotos
3. Los valores "Efectividad de IA" y "Tiempo Ahorrado" deben actualizarse
4. El gráfico de barras debe mostrar actividad de los últimos 5 días

### Valores dinámicos esperados:
- **Efectividad**: % de candidatos interesados
- **Tiempo Ahorrado**: horas entre primera y última llamada
- **Gráfico**: Llamadas por día basadas en `fechaLlamada`

---

## ✅ **Problema 3: Candidatos y Seguimiento solo cargaban desde Dashboard**

### ¿Qué se arregló?
Ahora puede ir directamente a estas vistas sin pasar por Dashboard primero.

### Cómo probar:
1. **Opción A (Directo):** Abre la URL: `#/candidatos` (sin pasar por dashboard)
2. **Opción B (Directo):** Abre la URL: `#/seguimiento`
3. ✅ Los datos deben cargar automáticamente desde Supabase
4. Si no hay conexión a Supabase, mostrará datos locales en caché

### Comportamiento esperado:
- Carga inmediata con datos locales (de localStorage)
- Sincronización en background desde Supabase
- Si hay datos nuevos, se actualizan automáticamente

---

## ✅ **Problema 4: Eventos no se guardaban en base de datos**

### ¿Qué se arregló?
Los eventos ahora se guardan en la tabla `eventos` de Supabase.

### Cómo probar:
1. Navega a: `#/eventos` (Sistema de Eventos)
2. Haz clic en el botón **"+ Nuevo Evento"**
3. Completa los campos:
   - Nombre: "Evento de Prueba"
   - Tipo: "Entrevista"
   - Estado: "Programado"
   - Fecha: cualquier fecha
4. Haz clic en **"Guardar Evento"**
5. ✅ El evento debe aparecer en la lista
6. **Verificación BD:** Abre tu console de Supabase y confirma que aparece en la tabla `eventos`

### Funcionalidad adicional:
- **Editar:** Haz clic en el icono de lápiz
- **Eliminar:** Haz clic en el icono de basura
- Ambas acciones se sincronizarán con Supabase

---

## ✅ **Problema 5: Validación de candidato aparecía dos veces**

### ¿Qué se arregló?
Solo un único alert de validación cuando faltan campos obligatorios.

### Cómo probar:
1. Navega a: `#/candidatos` (Gestión de Candidatos)
2. Haz clic en **"+ Nuevo Candidato"**
3. Deja los campos vacíos o incompletos
4. Haz clic en **"Crear Candidato"**
5. ✅ Deberías ver **UN SOLO** alert diciendo:
   ```
   "Completa todos los campos obligatorios del candidato."
   ```
   (Antes aparecía dos veces)

### Campos obligatorios:
- Nombre
- Apellido
- Correo
- Teléfono
- Fecha de Nacimiento
- Número de Documento
- Tipo de Documento
- Género
- Tipo de Convenio
- Departamento
- Municipio
- Sede de Interés
- Estrato
- Estado de Gestión

---

## ✅ **Problema 6: Reportes y Descargas - Datos quemados**

### ¿Qué se arregló?
El apartado "Resumen General" ahora muestra números reales, no fijos.

### Cómo probar:
1. Navega a: `#/reportes` (Reportes y Descargas)
2. Desplázate al apartado **"Resumen General"**
3. ✅ Verifica que los números coincidan con tus datos:

| Campo | Cálculo |
|-------|---------|
| **Registros** | Total de candidatos en tu base de datos |
| **Conversión (%)** | Candidatos con estado "Admitido" / Total × 100 |
| **Municipios** | Cantidad de municipios únicos representados |
| **Optimizadas (h)** | Horas entre la primera y última llamada |

### Ejemplo:
Si tienes:
- 50 candidatos registrados
- 30 admitidos
- Municipios: Medellín, Bogotá, Cali (3 únicos)
- Llamadas desde hoy a la semana pasada (168 horas)

Deberías ver:
```
Registros: 50
Conversión: 60%
Municipios: 3
Optimizadas: 168h
```

---

## 🔄 **Flujo de Sincronización**

### Sincronización automática:
```
1. Usuario abre vista (candidatos, eventos, seguimiento, etc.)
2. Se cargan datos locales de localStorage inmediatamente
3. En background, se sincroniza desde Supabase
4. Si hay cambios, se actualiza automáticamente la UI
5. Si Supabase no responde, continúa con datos locales
```

### Almacenamiento local (localStorage keys):
- `candidatos_riwicalls` - JSON array de candidatos
- `llamadas_riwicalls` - JSON array de llamadas
- `eventos_riwicalls` - JSON array de eventos

---

## 📋 **Checklist de Verificación**

```
Candidatos y Seguimiento:
☐ Ir a #/candidatos sin pasar por dashboard
☐ Ver datos cargados inmediatamente
☐ Crear nuevo candidato sin validación duplicada
☐ Ver un único alert de error si falta campo

Eventos:
☐ Navegar a #/eventos
☐ Crear nuevo evento
☐ Confirmar en Supabase que se guardó
☐ Editar evento
☐ Eliminar evento

Analítica:
☐ Navegar a #/analitica
☐ Ver valores dinámicos (no 78% y 12h fijos)
☐ Gráfico de barras actualizado

Reportes:
☐ Navegar a #/reportes
☐ Descargar candidatos en CSV
☐ Descargar eventos en JSON
☐ Verificar resumen con números correctos
☐ Abrir archivo CSV en Excel
```

---

## 🆘 **Si Algo No Funciona**

### Build fallido:
```bash
npm run build
```
Si hay errores, reporta la salida exacta.

### Datos no cargan:
1. Abre DevTools (F12)
2. Verifica la consola por errores
3. Comprueba que localStorage tiene datos:
   ```javascript
   localStorage.getItem('candidatos_riwicalls')
   ```

### Supabase no conecta:
- Verifica variables de entorno en `.env`
- Confirma que `VITE_SUPABASE_URL` está correctamente configurado
- Fallback local debería funcionar de todas formas

---

## 📞 **Soporte**

Todos los cambios están documentados en `CAMBIOS_REALIZADOS.md`


