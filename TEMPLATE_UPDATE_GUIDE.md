# Email Şablonları - Güncelleme Özelliği

## Özellikler

Email şablonlarını yönetmek için tam CRUD (Create, Read, Update, Delete) işlevselliği sağlanmıştır.

### ✅ Desteklenen İşlemler

1. **Şablon Oluştur** - Yeni email şablonı oluşturma
2. **Şablon Listesi** - Tüm şablonları görüntüleme ve arama
3. **Şablon Düzenle** - Mevcut şablonu güncelleme
4. **Şablon Sil** - Şablonu silme
5. **Durum Yönetimi** - Şablonu aktif/pasif etme

---

## API Endpoints

### 1. Tüm Şablonları Getir
```http
GET /api/templates
```

**Yanıt:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "template_name": "Hoş Geldin Maili",
      "template_code": "welcome_member",
      "brevo_template_id": 123,
      "subject": "Aramıza Hoş Geldin!",
      "html_content": "<html>...</html>",
      "is_active": true,
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### 2. Belirli Bir Şablonu Getir
```http
GET /api/templates/:id
```

**Örnek:**
```http
GET /api/templates/1
```

### 3. Yeni Şablon Oluştur
```http
POST /api/templates
Content-Type: application/json

{
  "template_name": "Proje Davetiyesi",
  "template_code": "project_invite",
  "brevo_template_id": null,
  "subject": "Sizi bir projeye davet ediyoruz",
  "html_content": "<html>...</html>",
  "is_active": true
}
```

**Validasyon:**
- `template_name`: 1-100 karakter
- `template_code`: Sadece harf, rakam, underscore (1-50 karakter) ve **unique**
- `subject`: 1-200 karakter
- `html_content`: Boş olamaz
- `brevo_template_id`: Opsiyonel (Brevo template ID)

**Başarı Yanıtı (201):**
```json
{
  "success": true,
  "data": { /* EmailTemplate */ },
  "message": "Şablon başarıyla oluşturuldu"
}
```

### 4. Şablonu Güncelle (⭐ EN ÖNEMLİ)
```http
PATCH /api/templates/:id
Content-Type: application/json

{
  "template_name": "Yeni Ad",
  "subject": "Yeni Konu",
  "html_content": "<html>...</html>",
  "brevo_template_id": 456,
  "is_active": false
}
```

**Notlar:**
- `template_code` **güncellenemez** (sistemle bağlantılı)
- Sadece değiştirmek istediğiniz alanları gönderin
- Sistem şablonları (örn: `welcome_member`) 403 hatası verir

**Başarı Yanıtı (200):**
```json
{
  "success": true,
  "data": { /* Güncellenmiş EmailTemplate */ },
  "message": "Şablon başarıyla güncellendi"
}
```

### 5. Şablonu Sil
```http
DELETE /api/templates/:id
```

**Notlar:**
- Sistem şablonları silinemez (403 hatası)
- Bu işlem geri alınamaz

**Başarı Yanıtı (200):**
```json
{
  "success": true,
  "message": "Şablon başarıyla silindi"
}
```

---

## Frontend Kullanımı

### Seçenek 1: Supabase Doğrudan (Mevcut)

```typescript
// Şablonu güncelle
const { error } = await supabase
  .from('email_templates')
  .update({
    template_name: 'Yeni Ad',
    subject: 'Yeni Konu',
    html_content: '<html>...</html>',
    is_active: true,
  })
  .eq('id', templateId)

if (error) throw error
```

### Seçenek 2: API Hook Kullanımı

```typescript
import { useTemplateActions } from '../lib/useTemplateActions'

function MyComponent() {
  const { 
    loading, 
    error, 
    success, 
    updateTemplate,
    createTemplate,
    deleteTemplate 
  } = useTemplateActions()

  // Şablonu güncelle
  const handleUpdate = async () => {
    const updated = await updateTemplate(1, {
      template_name: 'Yeni Ad',
      subject: 'Yeni Konu',
      html_content: '<html>...</html>',
    })
    
    if (updated) {
      console.log('Başarılı:', updated)
    } else {
      console.log('Hata:', error)
    }
  }

  // Şablon oluştur
  const handleCreate = async () => {
    const created = await createTemplate({
      template_name: 'Test',
      template_code: 'test_code',
      subject: 'Test Konu',
      html_content: '<html>...</html>',
      is_active: true,
      brevo_template_id: null,
    })
  }

  // Şablonu sil
  const handleDelete = async () => {
    const success = await deleteTemplate(1)
  }

  return (
    <div>
      {loading && <p>Yükleniyor...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <button onClick={handleUpdate}>Güncelle</button>
    </div>
  )
}
```

---

## UI Bileşenleri

### TemplatesPanel
Ana şablon yönetim paneli. Şablon listesi, arama ve filtreleme.

```typescript
<TemplatesPanel />
```

**Özellikler:**
- Şablon listesi gösterimi
- Arama ve filtreleme (aktif/pasif)
- Yeni şablon oluşturma butonu
- Şablon düzenleme / silme

### TemplateForm
Şablon oluşturma ve düzenleme formu.

```typescript
<TemplateForm 
  mode="edit"
  templateId={1}
  initialData={template}
  onDone={() => {}}
  onUpdated={() => {}}
/>
```

**Props:**
- `mode`: `'create'` | `'edit'`
- `templateId`: Düzenlemek için template ID
- `initialData`: İlk veri (editlerde otomatik yüklenir)
- `onDone`: Form kapatılıyor
- `onCreated`: Şablon oluşturuldu
- `onUpdated`: Şablon güncellendi

---

## Sistem Şablonları (Protected)

Bu şablonlar sistem tarafından yönetilir ve sınırlı biçimde düzenlenebilir:

- `welcome_member`
- `task_assigned`
- `project_member`
- `department_member`
- `area_member`
- `member_area_assigned`
- `speaker_invite`
- `event_speaker`
- `event_staff_member`
- `announcement_general`
- `announcement_member`
- `birthday_personal`
- `birthday_team`

**Kısıtlamalar:**
- ❌ Silinemez
- ❌ Kodu değiştirilemez
- ✅ Ad, konu, HTML içerik ve durum değiştirilebilir

---

## Placeholder Desteği

Email şablonlarında dinamik içerik için placeholder'lar kullanılabilir:

```html
<h1>Merhaba {{user_name}}!</h1>
<p>Projeniz hakkında: {{project_title}}</p>
<a href="{{invite_link}}">Davet Linkini Tıkla</a>
```

**Placeholder Format:** `{{variable_name}}`

PlaceholderHelper bileşeni, erişilebilir placeholder'ları gösterir.

---

## Hata Yönetimi

API tüm hata durumlarında uygun HTTP status kodları döndürür:

| Kod | Anlam | Örnek |
|-----|-------|-------|
| 400 | Bad Request | Geçersiz veri |
| 404 | Not Found | Şablon bulunamadı |
| 409 | Conflict | Template code zaten kullanımda |
| 403 | Forbidden | Sistem şablonu işlemi |
| 500 | Server Error | Veritabanı hatası |

---

## Test Örneği

```bash
# Yeni şablon oluştur
curl -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "template_name": "Test Şablonu",
    "template_code": "test_template",
    "subject": "Test Konu",
    "html_content": "<p>Merhaba {{name}}</p>",
    "is_active": true
  }'

# Şablonu güncelle (ID: 5)
curl -X PATCH http://localhost:3000/api/templates/5 \
  -H "Content-Type: application/json" \
  -d '{
    "template_name": "Güncellenmiş Ad",
    "subject": "Yeni Konu",
    "is_active": true
  }'

# Şablonu sil
curl -X DELETE http://localhost:3000/api/templates/5
```

---

## İlgili Dosyalar

- **Backend:** `server/routes/templates.ts`
- **Frontend Hook:** `src/lib/useTemplateActions.ts`
- **UI Bileşeni:** `src/components/TemplateForm.tsx`
- **Listeme Paneli:** `src/components/TemplatesPanel.tsx`
- **Tipler:** `src/lib/types.ts` (`EmailTemplate` interface)
