<?php

$baseSource = 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/28/20426';
$amendments = [
    '122' => ['Republic Act No. 7659', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/1787', 'Current heading includes piracy or mutiny on the high seas or in Philippine waters under Republic Act No. 7659.'],
    '134-A' => ['Republic Act No. 6968', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/1485', 'Added by Republic Act No. 6968.'],
    '136' => ['Republic Act No. 6968', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/1485', 'Amended by Republic Act No. 6968.'],
    '150' => ['Republic Act No. 10951', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/78880', 'Current provision verified in Republic Act No. 10951.'],
    '154' => ['Republic Act No. 10951', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/78880', 'Current provision verified in Republic Act No. 10951.'],
    '155' => ['Republic Act No. 11926', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/95589', 'Amended by Republic Act No. 11926.'],
    '167' => ['Republic Act No. 10951', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/78880', 'Current provision verified in Republic Act No. 10951.'],
    '183' => ['Republic Act No. 11594', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/93879', 'Amended by Republic Act No. 11594.'],
    '184' => ['Republic Act No. 11594', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/93879', 'Amended by Republic Act No. 11594.'],
    '202' => ['Republic Act No. 10158', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/37489', 'Vagrancy was decriminalized; only Prostitutes, the conduct retained by Republic Act No. 10158, is cataloged.'],
    '254' => ['Republic Act No. 11926', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/95589', 'Amended by Republic Act No. 11926.'],
    '266-A' => ['Republic Acts Nos. 8353 and 11648', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/94255', 'Rape is cataloged at Article 266-A as amended by Republic Acts Nos. 8353 and 11648; former Article 335 is excluded.'],
    '289' => ['Republic Act No. 10951', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/78880', 'Current provision verified in Republic Act No. 10951.'],
    '320' => ['Republic Act No. 7659', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/1787', 'Destructive Arson is retained under Article 320 as amended by Republic Act No. 7659; Articles 321 to 326-B are excluded under Presidential Decree No. 1613.'],
    '341' => ['Batas Pambansa Blg. 186', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/14712', 'Amended by Batas Pambansa Blg. 186.'],
];

$rows = <<<'RPC'
114|Treason
115|Conspiracy and Proposal to Commit Treason
116|Misprision of Treason
117|Espionage
118|Inciting to War or Giving Motives for Reprisals
119|Violation of Neutrality
120|Correspondence with Hostile Country
121|Flight to Enemy's Country
122|Piracy in General and Mutiny on the High Seas or in Philippine Waters
123|Qualified Piracy
124|Arbitrary Detention
125|Delay in the Delivery of Detained Persons to the Proper Judicial Authorities
126|Delaying Release
127|Expulsion
128|Violation of Domicile
129|Search Warrants Maliciously Obtained and Abuse in Their Service
130|Searching Domicile Without Witnesses
131|Prohibition, Interruption, and Dissolution of Peaceful Meetings
132|Interruption of Religious Worship
133|Offending the Religious Feelings
134|Rebellion or Insurrection
134-A|Coup d'Etat
136|Conspiracy and Proposal to Commit Rebellion, Insurrection, or Coup d'Etat
137|Disloyalty of Public Officers or Employees
138|Inciting to Rebellion or Insurrection
139|Sedition
141|Conspiracy to Commit Sedition
142|Inciting to Sedition
143|Acts Tending to Prevent the Meeting of Congress and Similar Bodies
144|Disturbance of Proceedings
145|Violation of Parliamentary Immunity
146|Illegal Assemblies
147|Illegal Associations
148|Direct Assaults
149|Indirect Assaults
150|Disobedience to Summons Issued by Congress or the Constitutional Commissions
151|Resistance and Disobedience to a Person in Authority or an Agent
153|Tumults and Other Disturbances of Public Order
154|Unlawful Use of Means of Publication and Unlawful Utterances
155|Alarms and Scandals
156|Delivering Prisoners from Jail
157|Evasion of Service of Sentence
158|Evasion of Service of Sentence on the Occasion of Calamities
159|Other Cases of Evasion of Service of Sentence
160|Commission of Another Crime During Service of Penalty
161|Counterfeiting the Great Seal or Forging the Signature or Stamp of the Chief Executive
162|Using Forged Signature or Counterfeit Seal or Stamp
163|Making, Importing, and Uttering False Coins
164|Mutilation, Importation, and Utterance of Mutilated Coins
165|Selling False or Mutilated Coin Without Connivance
166|Forging, Importing, and Uttering Instruments Payable to Bearer
167|Counterfeiting, Importing, and Uttering Instruments Not Payable to Bearer
168|Illegal Possession and Use of False Treasury or Bank Notes and Other Instruments of Credit
170|Falsification of Legislative Documents
171|Falsification by Public Officer, Employee, Notary, or Ecclesiastical Minister
172|Falsification by Private Individuals and Use of Falsified Documents
173|Falsification of Wireless, Cable, Telegraph, and Telephone Messages
174|False Medical Certificates and False Certificates of Merit or Service
175|Using False Certificates
176|Manufacturing and Possession of Instruments for Falsification
177|Usurpation of Authority or Official Functions
178|Using Fictitious Name and Concealing True Name
179|Illegal Use of Uniforms or Insignia
180|False Testimony Against a Defendant
181|False Testimony Favorable to the Defendant
182|False Testimony in Civil Cases
183|False Testimony in Other Cases and Perjury in Solemn Affirmation
184|Offering False Testimony in Evidence
200|Grave Scandal
201|Immoral Doctrines, Obscene Publications, and Exhibitions
202|Prostitutes
204|Knowingly Rendering Unjust Judgment
205|Judgment Rendered Through Negligence
206|Unjust Interlocutory Order
207|Malicious Delay in the Administration of Justice
208|Dereliction of Duty in the Prosecution of Offenses
209|Betrayal of Trust by an Attorney or Solicitor
210|Direct Bribery
211|Indirect Bribery
212|Corruption of Public Officials
213|Frauds Against the Public Treasury and Similar Offenses
214|Other Frauds by a Public Officer
215|Prohibited Transactions
216|Possession of Prohibited Interest by a Public Officer
217|Malversation of Public Funds or Property
218|Failure of Accountable Officer to Render Accounts
219|Failure of a Responsible Public Officer to Render Accounts Before Leaving the Country
220|Illegal Use of Public Funds or Property
221|Failure to Make Delivery of Public Funds or Property
223|Conniving with or Consenting to Evasion
224|Evasion Through Negligence
225|Escape of Prisoner Under the Custody of a Person Not a Public Officer
226|Removal, Concealment, or Destruction of Documents
227|Officer Breaking Seal
228|Opening of Closed Documents
229|Revelation of Secrets by an Officer
230|Public Officer Revealing Secrets of a Private Individual
231|Open Disobedience
232|Disobedience to Order of Superior Officer
233|Refusal of Assistance
234|Refusal to Discharge Elective Office
235|Maltreatment of Prisoners
236|Anticipation of Duties of a Public Office
237|Prolonging Performance of Duties and Powers
238|Abandonment of Office or Position
239|Usurpation of Legislative Powers
240|Usurpation of Executive Functions
241|Usurpation of Judicial Functions
242|Disobeying Request for Disqualification
243|Orders or Requests by Executive Officers to Judicial Authority
244|Unlawful Appointments
245|Abuses Against Chastity
246|Parricide
247|Death or Physical Injuries Inflicted Under Exceptional Circumstances
248|Murder
249|Homicide
251|Death Caused in a Tumultuous Affray
252|Physical Injuries Inflicted in a Tumultuous Affray
253|Giving Assistance to Suicide
254|Discharge of Firearms
255|Infanticide
256|Intentional Abortion
257|Unintentional Abortion
258|Abortion Practiced by the Woman Herself or by Her Parents
259|Abortion Practiced by a Physician or Midwife and Dispensing of Abortives
260|Responsibility of Participants in a Duel
261|Challenging to a Duel
262|Mutilation
263|Serious Physical Injuries
264|Administering Injurious Substances or Beverages
265|Less Serious Physical Injuries
266|Slight Physical Injuries and Maltreatment
266-A|Rape
267|Kidnapping and Serious Illegal Detention
268|Slight Illegal Detention
269|Unlawful Arrest
270|Kidnapping and Failure to Return a Minor
271|Inducing a Minor to Abandon His or Her Home
272|Slavery
273|Exploitation of Child Labor
274|Services Rendered Under Compulsion in Payment of Debts
275|Abandonment of Persons in Danger and One's Own Victim
276|Abandoning a Minor
277|Abandonment of Minor by Person Entrusted with Custody and Indifference of Parents
278|Exploitation of Minors
280|Qualified Trespass to Dwelling
281|Other Forms of Trespass
282|Grave Threats
283|Light Threats
285|Other Light Threats
286|Grave Coercions
287|Light Coercions
288|Other Similar Coercions
289|Formation, Maintenance, or Prohibition of Labor or Capital Combination Through Violence or Threats
290|Discovering Secrets Through Seizure of Correspondence
291|Revealing Secrets with Abuse of Office
292|Revelation of Industrial Secrets
293|Robbery
294|Robbery with Violence Against or Intimidation of Persons
295|Robbery with Physical Injuries in an Uninhabited Place and by a Band
297|Attempted and Frustrated Robbery Under Certain Circumstances
298|Execution of Deeds by Means of Violence or Intimidation
299|Robbery in an Inhabited House, Public Building, or Edifice Devoted to Worship
300|Robbery in an Uninhabited Place and by a Band
302|Robbery in an Uninhabited Place or Private Building
303|Robbery of Cereals, Fruits, or Firewood
304|Possession of Picklocks or Similar Tools
306|Brigandage
307|Aiding and Abetting a Band of Brigands
308|Theft
310|Qualified Theft
311|Theft of Property of the National Library or National Museum
312|Occupation of Real Property or Usurpation of Real Rights in Property
313|Altering Boundaries or Landmarks
314|Fraudulent Insolvency
315|Swindling (Estafa)
316|Other Forms of Swindling
317|Swindling a Minor
318|Other Deceits
319|Removal, Sale, or Pledge of Mortgaged Property
320|Destructive Arson
327|Malicious Mischief
328|Special Cases of Malicious Mischief
329|Other Mischiefs
330|Damage and Obstruction to Means of Communication
331|Destroying or Damaging Statues, Public Monuments, or Paintings
333|Adultery
334|Concubinage
336|Acts of Lasciviousness
337|Qualified Seduction
338|Simple Seduction
339|Acts of Lasciviousness with the Consent of the Offended Party
340|Corruption of Minors
341|White Slave Trade
342|Forcible Abduction
343|Consented Abduction
347|Simulation of Births, Substitution of a Child, and Concealment or Abandonment of a Legitimate Child
348|Usurpation of Civil Status
349|Bigamy
350|Marriage Contracted Against Provisions of Laws
352|Performance of Illegal Marriage Ceremony
355|Libel by Means of Writings or Similar Means
356|Threatening to Publish and Offer to Prevent Publication for Compensation
357|Prohibited Publication of Acts Referred to in Official Proceedings
358|Slander
359|Slander by Deed
362|Libelous Remarks
363|Incriminating an Innocent Person
364|Intriguing Against Honor
365|Imprudence and Negligence
RPC;

return array_map(static function (string $row) use ($amendments, $baseSource): array {
    [$article, $name] = explode('|', $row, 2);
    [$amendatoryLaw, $source, $note] = $amendments[$article]
        ?? [null, $baseSource, 'Offense heading verified in the official Act No. 3815 publication; this catalog does not reproduce elements or penalties.'];

    return [
        'canonical_key' => 'rpc:'.$article,
        'name' => $name,
        'law_reference' => 'Act No. 3815, Article '.$article.($amendatoryLaw ? ', as amended by '.$amendatoryLaw : ''),
        'source_url' => $source,
        'source_note' => $note,
        'legacy_aliases' => $article === '315' ? ['Estafa'] : [],
    ];
}, array_values(array_filter(explode("\n", $rows))));
