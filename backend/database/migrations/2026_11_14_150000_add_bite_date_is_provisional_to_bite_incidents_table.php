<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('bite_incidents', 'bite_date_is_provisional')) {
            Schema::table('bite_incidents', function (Blueprint $table) {
                $table->boolean('bite_date_is_provisional')->default(false)->after('bite_date');
            });
        }

        // Backfill legacy registration/triage placeholder incidents created without verified exposure details
        DB::table('bite_incidents')
            ->where('episode_type', 'pending_assessment')
            ->where('status', 'awaiting_assessment')
            ->whereRaw("LOWER(COALESCE(remarks, '')) LIKE ?", ['%exposure details await%'])
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('bite_incident_intakes')
                    ->whereColumn('bite_incident_intakes.bite_id', 'bite_incidents.bite_id');
            })
            ->update(['bite_date_is_provisional' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('bite_incidents', 'bite_date_is_provisional')) {
            Schema::table('bite_incidents', function (Blueprint $table) {
                $table->dropColumn('bite_date_is_provisional');
            });
        }
    }
};
