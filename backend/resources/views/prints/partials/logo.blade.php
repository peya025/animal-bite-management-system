@if(!empty($url))
    <img src="{{ $url }}" alt="{{ $side }} Seal" class="{{ $class ?? '' }}" style="width: {{ $size }}px; height: {{ $size }}px; object-fit: contain; flex-shrink: 0;" onerror="this.style.visibility='hidden'">
@else
    <div style="width: {{ $spacerSize ?? $size }}px; height: {{ $spacerSize ?? $size }}px; flex-shrink: 0;"></div>
@endif
