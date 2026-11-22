<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bite_incidents', function (Blueprint $table) {
            if (!Schema::hasColumn('bite_incidents', 'animal_observation_date')) {
                $table->date('animal_observation_date')->nullable()->after('animal_observation_status');
            }
            if (!Schema::hasColumn('bite_incidents', 'animal_last_checked_at')) {
                $table->timestamp('animal_last_checked_at')->nullable()->after('animal_observation_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bite_incidents', function (Blueprint $table) {
            if (Schema::hasColumn('bite_incidents', 'animal_last_checked_at')) {
                $table->dropColumn('animal_last_checked_at');
            }
            if (Schema::hasColumn('bite_incidents', 'animal_observation_date')) {
                $table->dropColumn('animal_observation_date');
            }
        });
    }
};
