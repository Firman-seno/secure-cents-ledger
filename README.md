# My Financial Compass

Saya ingin membuat aplikasi manajemen keuangan pribadi berbasis web yang benar-benar dapat digunakan oleh user, bukan hanya prototype atau tampilan UI.

Buat aplikasi full-stack yang memiliki frontend, backend, database, authentication, dan sistem keamanan data.

KONSEP APLIKASI

Aplikasi ini adalah aplikasi pencatatan keuangan pribadi yang dapat digunakan oleh banyak user.

Setiap user harus memiliki akun sendiri dan hanya dapat melihat serta mengelola data keuangannya sendiri.

Data keuangan antar-user tidak boleh tercampur.

Setiap user memiliki:

Akun pribadi

Dashboard pribadi

Data pemasukan sendiri

Data penarikan ATM sendiri

Data pengeluaran sendiri

Data saldo sendiri

Data rekening/dompet sendiri

Riwayat transaksi sendiri

Laporan keuangan sendiri

1. AUTHENTICATION

Buat sistem registrasi dan login yang benar-benar berfungsi.

Fitur:

Register

Login

Logout

Forgot Password

Reset Password

Session management

User profile

Saat user melakukan registrasi, simpan data user ke database.

Data registrasi:

Nama lengkap

Email

Password

Setelah berhasil login, user diarahkan ke Dashboard.

Pastikan setiap user memiliki user ID unik.

Gunakan authentication yang aman dan terintegrasi dengan database.

2. DATABASE

Gunakan database yang benar-benar aktif dan persistent.

Buat struktur database minimal:

Users

id

full_name

email

password/authentication reference

created_at

Accounts

Digunakan untuk menyimpan sumber dana user.

Field:

id

user_id

account_name

account_type

initial_balance

created_at

Jenis akun:

Bank

Cash

E-Wallet

Other

Contoh:
BCA
Cash
DANA
GoPay

Setiap account harus terhubung dengan user_id.

User A hanya boleh melihat akun milik User A.

User B hanya boleh melihat akun milik User B.

3. TRANSACTIONS

Buat tabel transaksi yang terhubung dengan user_id.

Field:

id

user_id

account_id

transaction_type

amount

transaction_date

category

description

created_at

updated_at

Jenis transaksi:

Income

Expense

ATM Withdrawal

Transfer

Semua transaksi harus terhubung dengan user_id.

Gunakan database security rules/row-level security agar user hanya dapat membaca, menambah, mengedit, dan menghapus data miliknya sendiri.

4. DASHBOARD USER

Setelah login, user melihat dashboard pribadi.

Tampilkan:

Total Balance
Total Income
Total Expense
Total ATM Withdrawal
Total Accounts

Tampilkan juga saldo setiap akun.

Contoh:

Total Balance
$1,500

Bank
$1,000

Cash
$300

E-Wallet
$200

Tampilkan grafik:

Income vs Expense

Balance History

Expense by Category

Semua data dashboard harus dihitung berdasarkan transaksi user yang sedang login.

Jangan gunakan data dummy sebagai data utama aplikasi.

5. TAMBAH UANG MASUK

User dapat menambahkan transaksi pemasukan.

Form:

Account

Date

Amount

Source

Description

Contoh:

Account: BCA
Date: July 27, 2026
Amount: $5,000
Source: Salary
Description: July Salary

Setelah disimpan:

Saldo akun bertambah.

Total income bertambah.

Transaksi muncul di riwayat.

6. PENARIKAN ATM

User dapat mencatat penarikan uang dari ATM.

Form:

From Account

To Account

Date

Amount

ATM Fee

Bank

Description

Contoh:

From: BCA
To: Cash
Amount: $500
ATM Fee: $2.50

Sistem harus otomatis:

Mengurangi saldo BCA sebesar $502.50 jika ATM fee dibebankan ke rekening.

Menambah saldo Cash sebesar $500.

Mencatat ATM fee sebagai biaya transaksi.

PENTING:

Penarikan ATM bukan pengeluaran.

Penarikan ATM adalah perpindahan uang dari Bank ke Cash.

Jangan menghitung jumlah penarikan sebagai Expense.

7. PENGELUARAN

User dapat mencatat pembelian atau pengeluaran.

Form:

Account

Date

Amount

Category

Item/Description

Payment Method

Receipt Image (optional)

Kategori:

Food

Transportation

Shopping

Education

Bills

Health

Entertainment

Household

Donation

Business

Other

Contoh:

Account: Cash
Date: July 27, 2026
Amount: $25
Category: Food
Description: Lunch

Setelah disimpan:

Saldo Cash berkurang $25.

Total Expense bertambah $25.

Transaksi masuk ke riwayat.

8. TRANSFER ANTAR AKUN

Buat fitur untuk memindahkan uang antar akun milik user.

Contoh:

From:
BCA

To:
Cash

Amount:
$500

Atau:

From:
BCA

To:
DANA

Amount:
$100

Transfer antar akun tidak dihitung sebagai Income maupun Expense.

Sistem hanya memindahkan saldo.

9. RIWAYAT TRANSAKSI

Buat halaman Transaction History.

Tampilkan:

Date

Type

Account

Category

Description

Income

Expense

Amount

Balance After Transaction

Fitur:

Search

Filter Date

Filter Type

Filter Category

Filter Account

Sort Newest/Oldest

User dapat:

Add

View

Edit

Delete

transaksi miliknya sendiri.

10. SALDO BERDASARKAN TANGGAL

Buat fitur untuk melihat kondisi keuangan user pada tanggal tertentu.

Contoh user memilih:

July 20, 2026

Sistem menampilkan:

Bank Balance
Cash Balance
E-Wallet Balance
Total Balance

Saldo dihitung berdasarkan seluruh transaksi user sampai tanggal yang dipilih.

Tambahkan fitur:

"View Balance on This Date"

11. LAPORAN KEUANGAN

Buat halaman Reports.

User dapat memilih:

Today

This Week

This Month

This Year

Custom Date Range

Tampilkan:

Total Income

Total Expense

Total ATM Withdrawal

Total Transfer

Net Cash Flow

Current Balance

Tambahkan grafik:

Income vs Expense

Expense by Category

Balance Over Time

12. DATA PRIVACY & SECURITY

Ini sangat penting.

Setiap data harus terhubung dengan user_id.

User hanya dapat:

Melihat datanya sendiri.

Menambahkan data ke akunnya sendiri.

Mengedit datanya sendiri.

Menghapus datanya sendiri.

User tidak boleh dapat mengakses data keuangan user lain.

Implementasikan database security menggunakan Row Level Security (RLS) atau mekanisme security yang sesuai dengan database yang digunakan.

Jangan menyimpan password secara manual dalam database biasa. Gunakan sistem authentication yang aman.

13. ADMIN PANEL

Buat role-based access.

Minimal ada dua role:

USER

Mengelola data keuangannya sendiri.

ADMIN

Melihat daftar user yang terdaftar.

Melihat statistik jumlah user.

Mengelola user jika diperlukan.

Tidak boleh melihat detail transaksi keuangan pribadi user kecuali fitur tersebut secara eksplisit diaktifkan oleh sistem.

14. RESPONSIVE DESIGN

Aplikasi harus dapat digunakan dengan baik pada:

Desktop

Laptop

Tablet

Mobile

Buat UI modern, profesional, sederhana, dan mudah digunakan.

Gunakan navigation:

Dashboard

Accounts

Income

Expenses

ATM Withdrawal

Transfers

Transactions

Reports

Profile

Settings

15. PERSISTENT DATA

Pastikan semua data tersimpan di database secara permanen.

Jika user:

Logout

Menutup browser

Membuka kembali aplikasi

Login dari perangkat lain

Maka semua data keuangan tetap tersedia.

Jangan menggunakan localStorage sebagai database utama.

Gunakan database backend yang benar-benar persistent.

16. VALIDATION

Tambahkan validasi:

Amount harus lebih besar dari 0.

User tidak dapat melakukan pengeluaran melebihi saldo akun jika fitur overdraft tidak diaktifkan.

Account harus dimiliki oleh user yang sedang login.

Transaction harus memiliki tanggal.

Transaction harus memiliki amount.

User tidak dapat mengakses ID transaksi milik user lain.

Tampilkan pesan error yang jelas dan mudah dipahami.

17. SEED / DEMO DATA

Sediakan opsi "Demo Account" untuk testing.

Namun, data demo harus dipisahkan dari data user asli.

Saat user melakukan registrasi baru, jangan otomatis menggunakan data demo sebagai data keuangan user tersebut.

18. HASIL AKHIR

Saya ingin mendapatkan aplikasi keuangan yang benar-benar bisa digunakan.

Pastikan:

User dapat Register.

User dapat Login.

User dapat Logout.

User dapat membuat Account.

User dapat mencatat Income.

User dapat mencatat Expense.

User dapat mencatat ATM Withdrawal.

User dapat melakukan Transfer antar Account.

Saldo dihitung otomatis.

User dapat melihat saldo pada tanggal tertentu.

User dapat melihat riwayat transaksi.

User dapat mengedit transaksi.

User dapat menghapus transaksi.

User dapat melihat laporan keuangan.

Data tersimpan secara permanen di database.

Data setiap user terisolasi dengan aman.

Aplikasi responsive di mobile dan desktop.

Semua fitur benar-benar berfungsi, bukan sekadar tampilan frontend.

Sebelum menyelesaikan aplikasi, lakukan pengecekan end-to-end terhadap alur berikut:

REGISTER → LOGIN → CREATE ACCOUNT → ADD INCOME → ATM WITHDRAWAL → ADD EXPENSE → TRANSFER → CHECK BALANCE → VIEW TRANSACTION HISTORY → VIEW REPORT.

Pastikan seluruh alur tersebut dapat berjalan tanpa error dan data yang dimasukkan benar-benar tersimpan di database.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://secure-cents-ledger.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/799c3e5d-0175-48e2-b776-a30519c17f58).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
