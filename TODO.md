# TODO - Görev 3 Hatayı Düzelt

- [ ] 1) src/components/MailHistoryTable.tsx
  - [ ] `/api/compose/history` fetch çağrısını tamamen kaldır
  - [ ] Supabase ile `manual_emails` tablosundan pagination + `count: 'exact'` kullanarak oku
  - [ ] `fetchHistory` fonksiyonunu Supabase client ile güncelle (60 sn auto-refresh dahil)

- [ ] 2) src/components/ComposeEditor.tsx
  - [ ] Hata 2 için preview iframe `sandbox` attribute'unu `allow-same-origin allow-scripts` olacak şekilde güncelle

- [ ] 3) server/routes/composeSend.ts
  - [ ] Dosyayı verilen şablona uygun şekilde yeniden yaz
  - [ ] Her kod yolunda mutlaka `res.status(...).json(...)` dönülmesini sağla
  - [ ] Validasyonlar, settings check, supabase insert + send loop + manual_emails update akışını şablona göre düzenle

- [ ] 4) src/components/ComposeForm.tsx
  - [ ] `/api/compose/send` fetch response’unu `resp.text()` ile al
  - [ ] Boş response’a karşı koruma ekle
  - [ ] `JSON.parse` try/catch ile güvenli parse et
  - [ ] HTTP ok değilse server error bilgisini kullanarak throw et

- [ ] 5) server/index.ts
  - [ ] `express.json` middleware’ini route’lardan önce doğrula
  - [ ] `express.urlencoded` ekle ve middleware’lerin sırasını standardize et
