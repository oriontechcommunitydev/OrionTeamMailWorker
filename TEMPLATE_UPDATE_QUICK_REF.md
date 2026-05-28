# Email Şablonları Güncelleme - Hızlı Referans

## 🎯 Özet

Email şablonlarını güncelleme özelliği **tam olarak uygulanmıştır**. İki yöntemi kullanabilirsiniz:

---

## ✨ Mevcut Özellikler

### 1️⃣ Frontend - Supabase Doğrudan Yöntem (Halihazırda Çalışan)

`TemplateForm.tsx` bileşeni zaten şablonları doğrudan Supabase'ten güncelleme özelliğine sahiptir:

```typescript
// TemplateForm.tsx - mode="edit" durumunda
if (mode === 'edit' && templateId != null) {
  const { error: err } = await supabase.from('email_templates').update({
    template_name: templateName.trim(),
    brevo_template_id: brevoId,
    subject: subject.trim(),
    html_content: htmlContent,
    is_active: isActive,
  }).eq('id', templateId)
  // ...
}
```

**Kullanımı:**
- Templates Panel'de şablona tıklayın → Edit butonu
- Değişiklikleri yapın → Kaydet butonu

---

### 2️⃣ Backend API - Yeni REST Endpoints

Şimdi eklenen profesyonel API endpoints:

#### POST /api/templates
```bash
curl -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "template_name": "Yeni Şablon",
    "template_code": "new_template",
    "subject": "Konu",
    "html_content": "<p>İçerik</p>"
  }'
```

#### PATCH /api/templates/:id ⭐ **GÜNCELLEME**
```bash
curl -X PATCH http://localhost:3000/api/templates/1 \
  -H "Content-Type: application/json" \
  -d '{
    "template_name": "Güncellenmiş Ad",
    "subject": "Yeni Konu",
    "is_active": true
  }'
```

#### DELETE /api/templates/:id
```bash
curl -X DELETE http://localhost:3000/api/templates/1
```

---

### 3️⃣ Frontend Hook - useTemplateActions

Uygun bir React hook API endpoint'lerini kullanmak için:

```typescript
import { useTemplateActions } from '../lib/useTemplateActions'

function MyComponent() {
  const { updateTemplate, loading, error, success } = useTemplateActions()

  const handleUpdate = async () => {
    await updateTemplate(1, {
      template_name: 'Yeni Ad',
      subject: 'Yeni Konu',
      html_content: '<html>...</html>'
    })
  }

  return (
    <>
      {error && <div>{error}</div>}
      {success && <div>{success}</div>}
      <button onClick={handleUpdate} disabled={loading}>
        Güncelle
      </button>
    </>
  )
}
```

---

## 📁 Yeni Dosyalar

### Backend
- ✅ `server/routes/templates.ts` - REST API endpoints

### Frontend
- ✅ `src/lib/useTemplateActions.ts` - React hook
- ✅ `src/components/TemplateUpdateExample.tsx` - Örnek bileşen

### Dokümantasyon
- ✅ `TEMPLATE_UPDATE_GUIDE.md` - Detaylı rehber

---

## 📊 Desteklenen İşlemler

| İşlem | Supabase | API | Hook |
|-------|----------|-----|------|
| Şablon Oluştur | ✅ | ✅ | ✅ |
| Şablonları Listele | ✅ | ✅ | ✅ |
| Şablon Getir | ✅ | ✅ | ✅ |
| **Şablon Güncelle** | ✅ | ✅ | ✅ |
| Şablon Sil | ✅ | ✅ | ✅ |

---

## 🔐 Kısıtlamalar

### Sistem Şablonları
Şu template kodları sistem tarafından korunmaktadır:
- `welcome_member`, `task_assigned`, `project_member`, vb.

**İzin verilen işlemler:**
- ✅ Ad, konu, HTML, durum değişimi
- ❌ Kod değişimi
- ❌ Silme

### Validasyon
- Template Name: 1-100 karakter
- Template Code: Sadece `[A-Za-z0-9_]`, benzersiz, 1-50 karakter
- Subject: 1-200 karakter
- HTML Content: Zorunlu, boş olamaz
- Brevo ID: Opsiyonel (tam sayı)

---

## 🚀 Kullanım Senaryoları

### Senaryo 1: UI'dan Güncelle (Hazır)
```
TemplatesPanel → Template Seç → Düzenle → Form Doldur → Kaydet ✅
```

### Senaryo 2: API'dan Doğrudan Güncelle (Yeni)
```
fetch() → PATCH /api/templates/1 → Başarı Yanıtı ✅
```

### Senaryo 3: Hook Kullanarak Güncelle (Yeni)
```
useTemplateActions() → updateTemplate(1, {...}) → Hook Yönetir ✅
```

---

## 🧪 Test Komutu

```bash
# Mevcut template ID'sini kontrol et
curl http://localhost:3000/api/templates

# Bir template'i güncelle (ID: 1 olarak varsay)
curl -X PATCH http://localhost:3000/api/templates/1 \
  -H "Content-Type: application/json" \
  -d '{"template_name": "Test Adı"}'
```

---

## 📚 İlgili Dosyalar

```
OrionTeamMailWorker/
├── server/
│   ├── index.ts ✏️ (templatesRouter eklendi)
│   └── routes/
│       └── templates.ts ✨ (YENI - API endpoints)
├── src/
│   ├── lib/
│   │   ├── useTemplateActions.ts ✨ (YENI - React hook)
│   │   └── types.ts (EmailTemplate interface)
│   └── components/
│       ├── TemplateForm.tsx (Update özelliği zaten var)
│       ├── TemplatesPanel.tsx (Yönetim paneli)
│       ├── TemplateCard.tsx
│       ├── DeleteTemplateButton.tsx
│       └── TemplateUpdateExample.tsx ✨ (YENI - Örnek)
└── TEMPLATE_UPDATE_GUIDE.md ✨ (YENI - Detaylı dokümantasyon)
```

---

## ✅ Kontrol Listesi

- [x] Backend API endpoints oluşturuldu
- [x] Frontend hook yazıldı
- [x] Validasyon eklendi
- [x] Error handling yapılandırıldı
- [x] Sistem şablonları korundu
- [x] Örnek bileşen sağlandı
- [x] Dokümantasyon yazıldı
- [x] Server'a route kaydedildi

---

## 🎓 Sonraki Adımlar (Opsiyonel)

1. **Frontend'i API Tabanlı Yapın**
   - `TemplateForm.tsx` içinde `useTemplateActions` hook'u kullanın
   - Supabase doğrudan çağrılarını değiştirin

2. **Form Validasyonunu Geliştirin**
   - Placeholder'ları otomatik algıla
   - HTML taşıma dosyası öner

3. **Şablon Sürümlemesi**
   - Eski sürümleri sakla
   - Geri dönüş desteği

4. **Brevo Entegrasyonu**
   - Brevo template'lerini senkronize et
   - İçerik sağlamacı desteği

---

## 📞 Destek

Herhangi bir sorun için:
1. Hata mesajını kontrol et
2. Server loglarını incele
3. Database bağlantısını verifikasyon et
