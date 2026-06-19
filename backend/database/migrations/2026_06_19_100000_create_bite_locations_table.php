<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('bite_locations', function (Blueprint $table) {
            $table->id('location_id');
            $table->foreignId('bite_id')->constrained('bite_incidents', 'bite_id')->cascadeOnDelete();
            
            // Location of Bite Incident
            $table->string('bite_address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('barangay')->nullable();
            $table->string('municipality')->nullable();
            
            $table->timestamps();
            
            $table->index('barangay');
            $table->index('municipality');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bite_locations');
    }
};
