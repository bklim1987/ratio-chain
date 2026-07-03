export function Countdown({ value }: { value: number }) {
  return (
    <div className="countdown-screen">
      <div key={value} className="countdown-number">
        {value > 0 ? value : "GO!"}
      </div>
    </div>
  );
}
