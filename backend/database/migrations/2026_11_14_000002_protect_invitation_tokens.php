<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['staff_invitations', 'patient_invitations'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->text('encrypted_token')->nullable());
            if ($name === 'patient_invitations') {
                Schema::table($name, fn (Blueprint $table) => $table->text('recipient_email')->nullable());
            }
            DB::table($name)->orderBy('id')->chunkById(100, function ($rows) use ($name) {
                foreach ($rows as $row) {
                    if ($name === 'patient_invitations') {
                        $email = DB::table('patients')->where('patient_id', $row->patient_id)->value('email');
                        DB::table($name)->where('id', $row->id)->update(['recipient_email' => $email ? Crypt::encryptString(trim($email)) : null]);
                    }
                    DB::table($name)->where('id', $row->id)->update([
                        'token' => hash('sha256', $row->token), 'encrypted_token' => Crypt::encryptString($row->token),
                    ]);
                }
            });
        }
    }

    public function down(): void
    {
        foreach (['staff_invitations', 'patient_invitations'] as $name) {
            DB::table($name)->orderBy('id')->chunkById(100, function ($rows) use ($name) {
                foreach ($rows as $row) {
                    if ($row->encrypted_token) {
                        DB::table($name)->where('id', $row->id)->update(['token' => Crypt::decryptString($row->encrypted_token)]);
                    }
                }
            });
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn($name === 'patient_invitations' ? ['encrypted_token', 'recipient_email'] : ['encrypted_token']));
        }
    }
};
