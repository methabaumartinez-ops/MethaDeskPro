'use client';
export default function TestCSS() {
    return (
        <div style={{ backgroundColor: 'blue', color: 'white', padding: '20px', fontSize: '24px' }}>
            This should be BLUE with WHITE text.
            <div className="test-class">This should be GREEN (CSS Var)</div>
            <div className="bg-primary p-4 rounded-xl">This should be ORANGE (Tailwind Primary)</div>
        </div>
    );
}
