<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Subpoena - {{ $data['docket_number'] }}</title>
<style>
    @page { size: 8.5in 13in; margin: 0.5in 0.75in 0.75in; }
    body { font-family: "Times New Roman", serif; font-size: 11pt; line-height: 1.15; margin: 0; }
    .page { position: relative; min-height: 11.75in; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .header { width: 100%; position: relative; text-align: center; margin-bottom: 12px; }
    .header img { width: 95px; position: absolute; top: 0; }
    .logo-left { left: 0; }
    .logo-right { right: 0; }
    .separator { text-align: center; margin: 12px 0; font-size: 12pt; white-space: nowrap; }
    .party-line { margin-bottom: 3px; }
    .case-row { width: 100%; margin-top: 5px; margin-bottom: 10px; }
    .case-row td { vertical-align: top; }
    .versus { padding-left: 4em; }
    .nps-block { text-align: right; padding-right: 10px; }
    .subpoena-title { text-align: center; margin: 15px 0 12px; font-weight: bold; text-decoration: underline; font-size: 12pt; }
    .to-block { margin: 0 0 10px 10px; }
    .to-entry { width: 100%; margin: 0 0 2px 25px; }
    .to-entry td { font-weight: bold; vertical-align: top; }
    .address { white-space: nowrap; padding-left: 30px; }
    p { margin: 4px 0; text-align: justify; }
    .signature { margin-top: 35px; text-align: right; margin-right: 40px; }
    .return-block { margin-top: 50px; }
    .footer { position: fixed; left: 0; right: 0; bottom: -0.48in; text-align: center; font-size: 10pt; color: #444; }
</style>
</head>
<body>
@foreach ($groupedParties as $group)
<div class="page">
    <div class="header">
        <img src="{{ $dojLogo }}" class="logo-left" alt="">
        <img src="{{ $bpLogo }}" class="logo-right" alt="">
        <div>
            REPUBLIC OF THE PHILIPPINES<br>
            <strong>DEPARTMENT OF JUSTICE</strong><br>
            <strong>NATIONAL PROSECUTION SERVICE</strong><br>
            <strong>OFFICE OF THE PROVINCIAL PROSECUTOR</strong><br>
            Province of Nueva Ecija<br>
            Cabanatuan City
        </div>
    </div>

    <p>The Chief of Police <br> <strong>{{ strtoupper($data['police_station']) }}</strong></p>
    <p style="margin-left: 4em;">You are hereby ordered to cause the service of this Subpoena upon the person/s cited herein </p>
    <p>and return the same on or before the date of the investigation.</p>

    <div class="separator">x---------------------------------------------------------------------------------------------------------------------------x</div>

    <div>
        @foreach ($complainants as $person)
            <div class="party-line"><strong>{{ strtoupper(collect([$person['first_name'], $person['middle_name'], $person['last_name'], $person['suffix']])->filter()->implode(' ')) }}</strong></div>
        @endforeach
        <div style="margin-left: 80px;">Complainant/s</div>
    </div>
    <br>
    <table class="case-row"><tr>
        <td class="versus">- versus -</td>
        <td class="nps-block">NPS No. <strong>{{ $data['docket_number'] }}</strong><br>For:<strong>{!! strtoupper($crimesDisplay) !!}</strong></td>
    </tr></table>

    <div>
        @foreach ($respondents as $person)
            <div class="party-line"><strong>{{ strtoupper(collect([$person['first_name'], $person['middle_name'], $person['last_name'], $person['suffix']])->filter()->implode(' ')) }}</strong></div>
        @endforeach
        <div style="margin-left:80px;">Respondent/s</div>
    </div>

    <div>x-------------------------------------------------------x</div>
    <div class="subpoena-title">SUBPOENA</div>
    <div class="to-block"><strong>To:</strong></div>

    @foreach ($group as $person)
        <table class="to-entry"><tr>
            <td>{{ strtoupper(collect([$person['first_name'], $person['middle_name'], $person['last_name']])->filter()->implode(' ')) }}</td>
            <td class="address">&ndash; Brgy. {{ $person['barangay'] }}, {{ $person['municipality'] }}, {{ $person['province'] }}</td>
        </tr></table>
    @endforeach

    <br>
    <p style="margin-left: 4em;">Under and by virtue of the authority vested in me by law, you are hereby commanded and required to  </p>
    <p>appear before this Office in the Preliminary Investigation of the above-entitled case on
        <strong>
        @if ($data['hearing_date_1'] && $data['hearing_date_2'])
            {{ $data['hearing_date_1']->format('F d & ') }}{{ $data['hearing_date_2']->format('d, Y') }}
        @else
            {{ $data['hearing_date_1']->format('F d, Y') }}
        @endif
        </strong>
        at <strong>{{ $data['hearing_date_1']->format('h:i A') }}</strong>, at the Office of the Provincial Prosecutor, Hall of Justice, Accfa District, Maharlika Highway, Cabanatuan City.
    </p>

    <p style="margin-left: 4em;"> Respondents is/are directed to submit his/her/their counter-affidavit and other supporting documents  or </p>
    <p>affidavit/s of your witness/es, if any, to be sworn to before me on <strong>{{ $data['hearing_date_1']->format('F d, Y') }} </strong> at {{ $data['hearing_date_1']->format('h:i A') }} Attached is a copy of the complaint and other evidence submitted by the complainant.</p>

    <p style="margin-left: 4em;"> Respondent/s is/are hereby <strong>WARNED</strong> that failure on your part to comply with this Subpoena shall be</p>
    <p>considered a waiver of your right to present your defense and the case shall be considered submitted for resolution based on the evidence on record.</p>

    <p><strong>FAIL NOT UNDER THE PENALTY OF LAW.</strong></p>
    <p><strong>WITNESS MY HAND</strong> this {{ $data['date']->format('d') }}<sup>th</sup> day of {{ $data['date']->format('F, Y') }} at Cabanatuan City.</p>

    <div class="signature">
        <strong>HON. {{ strtoupper($prosecutorName) }}</strong><br>
        Prosecution Attorney<br><br>
        By: {{ $staffName }}
    </div>

    <div class="return-block">
        <strong>Return:</strong>
        On this day, I have served a copy of the foregoing subpoena to ________________________________.<br><br>
        Server: ____________________________
    </div>

    <div class="footer">To view this case online, visit PlaceHolder.com, Enter the I.S. NO., and PIN: {{ $pin }}</div>
</div>
@endforeach
</body>
</html>
