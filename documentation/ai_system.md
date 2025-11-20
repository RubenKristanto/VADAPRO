## Implementasi AI Pada VADAPRO Menggunakan Google AI Studio API


### File-file yang Berperan :
- ProcessPage.jsx (vadapro_frontend/src/)   =>  tempat user mengakses fitur chat AI
- aiService.js (vadapro_frontend/src/services/) =>  menghubungkan implementasi AI di frontend dengan di backend
- workYearCotroller.js (vadapro_backend/controllers/)   => mengupload file ke gemini file API
- aiController.js (vadapro_backend/controllers/)    =>  menyimpan fungsi sebenarnya untuk mengimplementasikan AI


### Alur Bagaimana Sistem Bekerja :

1. Setelah user meng-upload file csv melalui data page, fungsi "uploadDatasheets" pada workYearController.js akan meng-upload file csv ke gemini file API segera setelah proses upload ke database mongoDB selesai. Upload ke gemini file API bertujuan agar model AI dapat menyimpan referensi ke file tanpa memakan banyak token.
   
2. Saat user mengetik pertanyaan pada kolom chat di ProcessPage.jsx dan menekan tombol kirim, function "handleSendMessage" akan memanggil function "sendMessageToGemini" yang akan menyusun konteks yang akan dikirim ke AI. Setelah itu, function "analyzeData" pada file aiService.js akan dipanggil.

3. function "analyzeData" pada aiService.js akan memanggil function "analyzeData" yang ada di backend, tepatnya di file aiController.js untuk mengambil respon dari AI. Respon kemudian akan dikembalikan ke aiService.js, yang kemudian akan dikembalikan lagi ke ProcessPage.jsx dan ditempatkan di kolom respon pada sistem chat.


### Mekanisme Function "analyzeData" Pada AI Controller (core logic untuk sistem AI)

Function ini akan memecah parameter input (request) menjadi 6 bagian, yaitu :
- query         => pertanyaan user
- statistics    => parameter statistik hasil dari hitungan yang dilakukan danfo
- chartConfig   => informasi mengenai grafik hasil dari echart
- csvSummary    => informasi umum mengenai file csv
- csvData       => keseluruhan isi dari file csv
- context       => konteks eksternal mengenai organisasi, program, tahun dan data entry suatu proses

keenam parameter ini nantinya akan digabungkan kedalam satu prompt yang akan berisi semua informasi yang perlu diketahui oleh AI mengenai suatu proses, serta menyuruh AI untuk melihat ke lokasi tempat file csv diupload di gemini file API. Pengggabungan ini dilakukan oleh function lain bernama "executeRequest" yang akan dipanggil jika penggunaan user belum melewati batas.

Jika jumlah request melebihi batas yang ditetapkan oleh model AI yang digunakan, maka request dari user akan ditahan sementara namun tidak ditolak. AI memiliki batas Request per Minute (RPM) serta Request per Day (RPD) yang membatasi jumlah request yang dapat dikirim user. Khusus untuk RPM, function memiliki sistem queue untuk menyimpan request user untuk sementara waktu. Setelah satu menit berlalu, maka request yang ada pada queue akan kembali diproses oleh AI. Sistem queue tidak diaplikasikan untuk RPD karena waktu tunggu yang terlalu lama.

Di dalam function "executeRequest", statistikcs dan csvSummary akan dibersihkan dari data-data sensitif (jika ada) menggunakan function "sanitizeData" agar data-data sensitif tersebut tidak dapat dilihat melalui console pada browser.Setelah itu, barulah prompt dibentuk dan dikirm ke AI.