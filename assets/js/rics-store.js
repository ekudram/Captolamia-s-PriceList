// assets/js/rics-store.js
class RICSStore {
    constructor() {
        this.data = { items: [], events: [], traits: [], races: [], weather: [], commands: [], mods: [] };
        this.filteredData = { items: [], events: [], traits: [], races: [], weather: [], commands: [], mods: [] };
        this.currentSort = {};
        this.loadFailed = false;
        this.init();
    }

    async init() {
        this.setupThemeToggle();
        await this.loadAllData();
        this.renderAllTabs();
        this.setupEventListeners();
    }

    // ==================== THEME (light / dark) ====================
    getPreferredTheme() {
        try {
            const saved = localStorage.getItem('rics-theme');
            if (saved === 'light' || saved === 'dark') return saved;
        } catch (e) { /* private mode */ }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    applyTheme(theme, { persist = false } = {}) {
        const next = theme === 'dark' ? 'dark' : 'light';
        const root = document.documentElement;
        root.setAttribute('data-theme', next);
        root.classList.toggle('theme-dark', next === 'dark');
        root.classList.toggle('theme-light', next === 'light');
        // Some browsers cache color-scheme; keep it in sync
        root.style.colorScheme = next;
        if (persist) {
            try {
                localStorage.setItem('rics-theme', next);
            } catch (e) { /* ignore */ }
        }
        this.updateThemeToggleUi(next);
    }

    updateThemeToggleUi(theme) {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        const isDark = theme === 'dark';
        const icon = btn.querySelector('.theme-icon');
        const label = btn.querySelector('.theme-label');
        if (icon) icon.textContent = isDark ? '☀️' : '🌙';
        if (label) label.textContent = isDark ? 'Light' : 'Dark';
        btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    }

    setupThemeToggle() {
        const current = document.documentElement.getAttribute('data-theme') || this.getPreferredTheme();
        this.applyTheme(current, { persist: false });

        const btn = document.getElementById('theme-toggle');
        if (!btn) {
            console.warn('Theme toggle button #theme-toggle not found');
            return;
        }

        // Use a single reliable click handler (works even if init runs more than once)
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            const next = now === 'dark' ? 'light' : 'dark';
            this.applyTheme(next, { persist: true });
            console.log('Theme switched to', next);
        };

        // Follow OS theme only until the user picks one manually
        try {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                try {
                    if (localStorage.getItem('rics-theme')) return;
                } catch (err) { /* ignore */ }
                this.applyTheme(e.matches ? 'dark' : 'light', { persist: false });
            });
        } catch (e) { /* ignore */ }
    }

    async loadAllData() {
        this.loadFailed = false;
        const promises = [
            this.loadJson('items', 'data/StoreItems.json', this.processItemsData.bind(this)),
            this.loadJson('traits', 'data/Traits.json', this.processTraitsData.bind(this)),
            this.loadJson('races', 'data/RaceSettings.json', this.processRacesData.bind(this)),
            this.loadJson('events', 'data/Incidents.json', this.processEventsData.bind(this)),
            this.loadJson('weather', 'data/Weather.json', this.processWeatherData.bind(this)),
            this.loadJson('commands', 'data/CommandSettings.json', this.processCommandsData.bind(this)),
			this.loadJson('mods', 'data/ActiveMods.json', this.processModsData.bind(this))
        ];

        await Promise.allSettled(promises);

        if (this.loadFailed) {
            const warning = document.createElement('div');
            warning.style = 'background:#fff3cd; color:#856404; padding:12px; margin:16px; border-radius:6px; text-align:center;';
            warning.textContent = 'Warning: Some data files failed to load. Some tabs may be incomplete.';
            document.querySelector('.container').prepend(warning);
        }

        console.log('Data loaded:', {
            items: this.data.items.length,
            traits: this.data.traits.length,
            races: this.data.races.length,
            events: this.data.events.length,
            weather: this.data.weather.length,
            commands: this.data.commands.length,
            mods: this.data.mods.length
        });
    }

    async loadJson(key, url, processor) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const raw = await res.json();
            const data = (key === 'items' && raw.items) ? raw.items : raw;

            this.data[key] = processor(data);
            this.filteredData[key] = [...this.data[key]];
        } catch (e) {
            console.error(`Failed to load ${url}:`, e);
            this.loadFailed = true;
            this.data[key] = [];
            this.filteredData[key] = [];
        }
    }

    // ==================== COLOR & PROCESSORS (same as before) ====================
    convertRimWorldColors(text) {
        if (!text || typeof text !== 'string') return text;
        let result = text;
        result = result.replace(/<color=#([0-9a-fA-F]{6,8})>(.*?)<\/color>/gi, '<span style="color: #$1">$2</span>');
        result = result.replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>');
        result = result.replace(/<i>(.*?)<\/i>/gi, '<em>$1</em>');
        return result;
    }

    processItemsData(itemsObject) {
        return Object.entries(itemsObject || {})
            .map(([key, itemData]) => ({
                defName: itemData.DefName || key,
                name: itemData.CustomName || itemData.DefName || key,
                price: itemData.BasePrice || 0,
                category: itemData.Category || 'Misc',
                quantityLimit: itemData.HasQuantityLimit ? (itemData.QuantityLimit || 0) : 'Unlimited',
                limitMode: itemData.LimitMode,
                mod: itemData.Mod || 'Unknown',
                isUsable: itemData.IsUsable || false,
                isEquippable: itemData.IsEquippable || false,
                isWearable: itemData.IsWearable || false,
                enabled: itemData.Enabled !== false,
                modactive: itemData.modactive === true   // NEW
            }))
            .filter(item => item.modactive)               // ← Only show active mods
            .filter(item => (item.enabled || item.isUsable || item.isEquippable || item.isWearable))
            .filter(item => item.price > 0);
    }

    processEventsData(eventsObject) {
        return Object.entries(eventsObject || {})
            .map(([key, eventData]) => ({
                defName: eventData.DefName || key,
                label: eventData.Label || eventData.DefName || key,
                baseCost: eventData.BaseCost || 0,
                karmaType: eventData.KarmaType || 'None',
                modSource: eventData.ModSource || 'Unknown',
                enabled: eventData.Enabled !== false,
                modactive: eventData.modactive === true   // NEW
            }))
            .filter(event => event.modactive)             // ← Only show active mods
            .filter(event => event.enabled && event.baseCost > 0);
    }

    processTraitsData(traitsObject) {
        return Object.entries(traitsObject || {})
            .map(([key, traitData]) => ({
                defName: traitData.DefName || key,
                name: traitData.Name || traitData.DefName || key,
                description: this.processTraitDescription(traitData.Description || ''),
                stats: traitData.Stats || [],
                conflicts: traitData.Conflicts || [],
                canAdd: traitData.CanAdd || false,
                canRemove: traitData.CanRemove || false,
                addPrice: traitData.AddPrice || 0,
                removePrice: traitData.RemovePrice || 0,
                bypassLimit: traitData.BypassLimit || false,
                modSource: traitData.ModSource || 'Unknown',
                modactive: traitData.modactive === true   // NEW
            }))
            .filter(trait => trait.modactive)               // ← Only show active mods
            .filter(trait => trait.canAdd || trait.canRemove)
            .filter(trait => trait.addPrice > 0 || trait.removePrice > 0);
    }

    processWeatherData(weatherObject) {
        return Object.entries(weatherObject || {})
            .map(([key, weatherData]) => ({
                defName: weatherData.DefName || key,
                label: weatherData.Label || weatherData.DefName || key,
                description: weatherData.Description || '',
                baseCost: weatherData.BaseCost || 0,
                karmaType: weatherData.KarmaType || 'None',
                modSource: weatherData.ModSource || 'Unknown',
                enabled: weatherData.Enabled !== false,
                modactive: weatherData.modactive === true   // NEW
            }))
            .filter(weather => weather.modactive)         // ← Only show active mods
            .filter(weather => weather.enabled && weather.baseCost > 0);
    }

processRacesData(racesObject) {
    const grouped = {};

    Object.entries(racesObject || {}).forEach(([raceKey, raceData]) => {
        const baseRace = {
            defName: raceKey,
            name: raceData.DisplayName || raceKey,
            basePrice: Math.round(raceData.BasePrice || 0),
            minAge: raceData.MinAge || 0,
            maxAge: raceData.MaxAge || 0,
            allowCustomXenotypes: raceData.AllowCustomXenotypes || false,
            defaultXenotype: raceData.DefaultXenotype || 'None',
            enabled: raceData.Enabled !== false,
            modActive: raceData.ModActive !== false,
            allowedGenders: raceData.AllowedGenders || {},
            xenotypePrices: raceData.XenotypePrices || {},
            enabledXenotypes: raceData.EnabledXenotypes || {}
        };

        if (!baseRace.enabled || baseRace.modActive === false) return;

        if (!grouped[raceKey]) {
            grouped[raceKey] = {
                ...baseRace,
                isBaseRace: true,
                xenotypes: []
            };
        }

        // Add enabled xenotypes
        if (baseRace.enabledXenotypes) {
            Object.entries(baseRace.enabledXenotypes).forEach(([xenotype, isEnabled]) => {
                if (isEnabled && baseRace.xenotypePrices[xenotype] !== undefined) {
                    grouped[raceKey].xenotypes.push({
                        defName: `${raceKey}_${xenotype}`,
                        name: xenotype,
                        basePrice: Math.round(baseRace.xenotypePrices[xenotype]),
                        isXenotype: true,
                        parentRace: baseRace.name
                    });
                }
            });
        }
    });

    // Convert to array and sort base races alphabetically
    return Object.values(grouped)
        .sort((a, b) => a.name.localeCompare(b.name));
}

	processModsData(modsRoot) {
        if (!modsRoot || !modsRoot.mods) return [];
        return modsRoot.mods.map(mod => ({
            name: mod.name || "Unnamed Mod",
            author: mod.author || "Unknown",
            steamId: mod.steamId || null,
            version: mod.version || "—",
            exportedAt: modsRoot.exportedAt || null
        }));
    }

    /** Show every command (enabled and disabled) with full sub-settings. */
    processCommandsData(commandsObject) {
        return Object.entries(commandsObject || {})
            .map(([key, cmd]) => {
                const customSettings = this.parseCustomData(cmd.CustomData);
                return {
                    defName: key,
                    name: key,
                    label: cmd.Label || '',
                    description: this.normalizeCommandDescription(cmd.CommandDescription || cmd.Description || ''),
                    enabled: cmd.Enabled === true,
                    cooldownSeconds: cmd.CooldownSeconds ?? 0,
                    cost: cmd.Cost ?? 0,
                    supportsCost: cmd.SupportsCost === true,
                    permissionLevel: cmd.PermissionLevel || 'everyone',
                    requiresConfirmation: cmd.RequiresConfirmation === true,
                    commandAlias: cmd.CommandAlias || '',
                    useCommandCooldown: cmd.useCommandCooldown === true,
                    maxUsesPerCooldownPeriod: cmd.MaxUsesPerCooldownPeriod ?? 0,
                    allowedRaidTypes: Array.isArray(cmd.AllowedRaidTypes) ? cmd.AllowedRaidTypes : [],
                    allowedRaidStrategies: Array.isArray(cmd.AllowedRaidStrategies) ? cmd.AllowedRaidStrategies : [],
                    // Legacy top-level fields (older exports); preferred source is CustomData JSON
                    defaultRaidWager: cmd.DefaultRaidWager,
                    minRaidWager: cmd.MinRaidWager,
                    maxRaidWager: cmd.MaxRaidWager,
                    defaultMilitaryAidWager: cmd.DefaultMilitaryAidWager,
                    minMilitaryAidWager: cmd.MinMilitaryAidWager,
                    maxMilitaryAidWager: cmd.MaxMilitaryAidWager,
                    defaultLootBoxSize: cmd.DefaultLootBoxSize,
                    minLootBoxSize: cmd.MinLootBoxSize,
                    maxLootBoxSize: cmd.MaxLootBoxSize,
                    customDataRaw: cmd.CustomData || '',
                    customSettings
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    /** Normalize description text from Commands.xml (handles /n and \\n line breaks). */
    normalizeCommandDescription(text) {
        if (!text) return '';
        return String(text)
            .replace(/\\n/g, '\n')
            .replace(/\/n/g, '\n')
            .trim();
    }

    /**
     * CustomData in RICS is a JSON object of string values
     * (see CommandSettings.CustomData / Dialog_CommandManager).
     */
    parseCustomData(raw) {
        if (raw == null) return [];
        if (typeof raw === 'object' && !Array.isArray(raw)) {
            return Object.entries(raw).map(([key, value]) => this.normalizeCustomEntry(key, value));
        }
        if (typeof raw !== 'string') return [];
        const trimmed = raw.trim();
        if (!trimmed || trimmed === '{}') return [];
        try {
            const obj = JSON.parse(trimmed);
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
                return [this.normalizeCustomEntry('_raw', trimmed)];
            }
            return Object.entries(obj).map(([key, value]) => this.normalizeCustomEntry(key, value));
        } catch (e) {
            return [this.normalizeCustomEntry('_raw', trimmed)];
        }
    }

    normalizeCustomEntry(key, value) {
        const str = value == null ? '' : String(value);
        return {
            key,
            label: this.getCustomDataLabel(key),
            value: str,
            kind: this.detectCustomValueKind(str)
        };
    }

    detectCustomValueKind(str) {
        const lower = String(str).trim().toLowerCase();
        if (lower === 'true' || lower === 'false') return 'bool';
        if (str.trim() !== '' && !Number.isNaN(Number(str)) && /^-?\d+(\.\d+)?$/.test(str.trim())) return 'number';
        return 'text';
    }

    /** Friendly labels matching Commands.xml / Command Manager UI. */
    getCustomDataLabel(key) {
        const labels = {
            // Backstories
            childhoodWager: 'Childhood wager cost',
            adulthoodWager: 'Adulthood wager cost',
            // Loot / gifts / use
            showDebugInfo: 'Show debug info in lootbox messages',
            maxGiftAmount: 'Max gift amount',
            giftFeePercent: 'Gift fee % (taken from gift)',
            maxUsesPerPeriod: 'Max uses per period (0 = unlimited)',
            // Surgery
            allowGenderSwap: 'Allow gender swap',
            genderSwapCost: 'Gender swap cost',
            allowBodyChange: 'Allow body change',
            bodyChangeCost: 'Body change cost',
            allowSterilize: 'Allow sterilize',
            sterilizeCost: 'Sterilize cost',
            allowIUD: 'Allow IUD',
            iudCost: 'IUD cost',
            allowVasReverse: 'Allow vas reverse',
            vasReverseCost: 'Vas reverse cost',
            allowTerminate: 'Allow terminate',
            terminateCost: 'Terminate cost',
            allowHemogen: 'Allow hemogen',
            hemogenCost: 'Hemogen cost',
            allowTransfusion: 'Allow transfusion',
            transfusionCost: 'Transfusion cost',
            allowMiscBiotech: 'Allow misc biotech',
            miscBiotechCost: 'Misc biotech cost',
            // Military / raid
            defaultMilitaryAidWager: 'Default military aid wager',
            minMilitaryAidWager: 'Min military aid wager',
            maxMilitaryAidWager: 'Max military aid wager',
            defaultRaidWager: 'Default raid wager',
            minRaidWager: 'Minimum raid wager',
            maxRaidWager: 'Maximum raid wager',
            // MyPawn sub-views
            enableBody: 'Body',
            enableHealth: 'Health',
            enableImplants: 'Implants',
            enableGear: 'Gear',
            enableWeapon: 'Weapon',
            enableKills: 'Kills',
            enableNeeds: 'Needs',
            enableRelations: 'Relations',
            enableSkills: 'Skills',
            enableStats: 'Stats',
            enableStory: 'Story',
            enableTraits: 'Traits',
            enableWork: 'Work',
            enableJob: 'Job / action',
            enablePsycasts: 'Psycasts',
            enableMechs: 'Mechs',
            // Revive / heal / dye
            enableSelfRevive: 'Self revive',
            enableTargetRevive: 'Target revive',
            enableAllRevive: 'All revive',
            reviveCostMultiplier: 'Revive cost multiplier',
            enableSelfHeal: 'Self heal',
            enableTargetHeal: 'Target heal',
            enableAllHeal: 'All heal',
            healCostMultiplier: 'Heal cost multiplier',
            enableHairDye: 'Hair dye',
            enableApparelDye: 'Apparel dye',
            // Passion
            minPassionWager: 'Min passion wager',
            maxPassionWager: 'Max passion wager',
            passionWagerBonusPer100: 'Bonus % per 100 coins wagered',
            maxPassionWagerBonus: 'Maximum bonus from wager',
            basePassionSuccessChance: 'Base success chance (%)',
            maxPassionSuccessChance: 'Max success chance (%)',
            criticalSuccessRatio: 'Critical success multiplier (of base chance)',
            maxCriticalSuccessChance: 'Hard cap on critical success chance (%)',
            criticalFailBaseChance: 'Base critical failure chance (%)',
            criticalFailReductionFactor: 'Crit-fail reduction per success chance point',
            minCriticalFailChance: 'Minimum critical failure chance (%)',
            critSuccessUpgradeVsNewChance: 'Crit success: upgrade existing passion vs gain new',
            critFailLoseVsWrongChance: 'Crit fail: lose passion vs gain useless one',
            targetedCritFailAffectTargetChance: 'Targeted crit fail: affect target skill vs random',
            // Rescue
            leftBehindCost: 'Left-behind drop cost',
            capturedCost: 'Captured rescue-mission cost',
            // Interaction sub-commands
            enabled: 'Interaction enabled',
            _raw: 'Custom data'
        };
        if (labels[key]) return labels[key];
        // camelCase / PascalCase → readable words
        return String(key)
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .replace(/^\w/, c => c.toUpperCase());
    }

    processTraitDescription(description) {
        return description
            .replace(/{PAWN_nameDef}/g, 'Timmy')
            .replace(/{PAWN_name}/g, 'Timmy')
            .replace(/{PAWN_pronoun}/g, 'he')
            .replace(/{PAWN_possessive}/g, 'his')
            .replace(/{PAWN_objective}/g, 'him')
            .replace(/{PAWN_label}/g, 'Timmy')
            .replace(/{PAWN_def}/g, 'Timmy')
            .replace(/\[PAWN_nameDef\]/g, 'Timmy')
            .replace(/\[PAWN_name\]/g, 'Timmy')
            .replace(/\[PAWN_pronoun\]/g, 'he')
            .replace(/\[PAWN_possessive\]/g, 'his')
            .replace(/\[PAWN_objective\]/g, 'him')
            .replace(/\[PAWN_label\]/g, 'Timmy')
            .replace(/\[PAWN_def\]/g, 'Timmy');
    }

    // ==================== RENDERING (traits now correctly in first column) ====================
    renderAllTabs() {
        this.renderItems();
        this.renderEvents();
        this.renderWeather();
        this.renderTraits();
        this.renderRaces();
        this.renderCommands();
		this.renderMods();
    }

    renderItems() {
        const tbody = document.getElementById('items-tbody');
        const items = this.filteredData.items;
        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;">No items found</td></tr>';
            return;
        }
        tbody.innerHTML = items.map(item => `
            <tr>
                <td>
                    <div class="item-name">${this.escapeHtml(item.name)}</div>
                    <span class="metadata">
                        ${this.escapeHtml(item.defName)}<br>
                        From ${this.escapeHtml(this.getModDisplayName(item.mod))}<br>
                        Usage: !buy ${this.escapeHtml(item.name)} or !buy ${this.escapeHtml(item.defName)}
                        ${this.getUsageTypes(item)}
                    </span>
                </td>
                <td class="no-wrap"><strong>${item.price}</strong></td>
                <td>${this.escapeHtml(item.category)}</td>
                <td class="no-wrap">${item.quantityLimit}</td>
            </tr>
        `).join('');
    }

    renderEvents() { /* same as before */ 
        const tbody = document.getElementById('events-tbody');
        const events = this.filteredData.events;
        if (events.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:40px;">No events found</td></tr>'; return; }
        tbody.innerHTML = events.map(event => {
            const coloredLabel = this.convertRimWorldColors(event.label);
            return `<tr>
                <td><div class="item-name">${coloredLabel}</div><span class="metadata">${this.escapeHtml(event.defName)}<br>From ${this.escapeHtml(event.modSource)}<br>Usage: !event ${this.escapeHtml(event.label)} or !event ${this.escapeHtml(event.defName)}</span></td>
                <td class="no-wrap"><strong>${event.baseCost}</strong></td>
                <td>${this.escapeHtml(event.karmaType)}</td>
            </tr>`;
        }).join('');
    }

    renderTraits() {
        const tbody = document.getElementById('traits-tbody');
        const traits = this.filteredData.traits;
        if (traits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;">No traits found</td></tr>';
            return;
        }
    
        tbody.innerHTML = traits.map(trait => {
            const coloredName = this.convertRimWorldColors(trait.name);
            return `
            <tr>
                <td>
                    <div class="item-name">${coloredName}</div>
                    <span class="metadata">
                        ${this.escapeHtml(trait.defName)}
                        <br>From ${this.escapeHtml(trait.modSource)}
                        ${trait.bypassLimit ? '<br><span class="usage">Bypasses Limit</span>' : ''}
                    </span>
                </td>
                <td class="no-wrap">
                    ${trait.canAdd ? `<strong>${trait.addPrice}</strong>` : '<span class="metadata">Cannot Add</span>'}
                </td>
                <td class="no-wrap">
                    ${trait.canRemove ? `<strong>${trait.removePrice}</strong>` : '<span class="metadata">Cannot Remove</span>'}
                </td>
                <td>
                    <div class="trait-description">${this.convertRimWorldColors(trait.description)}</div>
                    ${this.renderTraitStats(trait)}
                    ${this.renderTraitConflicts(trait)}
                </td>
            </tr>
            `;
        }).join('');
    }

    renderTraitStats(trait) {
        if (!trait.stats?.length) return '';
        return `<div class="metadata"><strong>Stats:</strong><ul style="margin:5px 0;padding-left:20px;">${trait.stats.map(s => `<li>${this.convertRimWorldColors(s)}</li>`).join('')}</ul></div>`;
    }

    renderTraitConflicts(trait) {
        if (!trait.conflicts?.length) return '';
        return `<div class="metadata"><strong>Conflicts with:</strong><ul style="margin:5px 0;padding-left:20px;">${trait.conflicts.map(c => `<li>${this.convertRimWorldColors(c)}</li>`).join('')}</ul></div>`;
    }

	renderRaces() {
		const container = document.getElementById('races-container');
		const races = this.filteredData.races;   // now grouped base races

		if (races.length === 0) {
			container.innerHTML = '<div style="text-align:center;padding:40px;">No races found</div>';
			return;
		}

		let html = '';

		races.forEach(race => {
			const genders = this.getAvailableGenders(race.allowedGenders);
			const ageRange = `Age: ${race.minAge}-${race.maxAge === 999999 ? '∞' : race.maxAge}`;

			html += `
				<details class="race-group" open>
					<summary>
						<strong>${this.escapeHtml(race.name)}</strong> 
						— Price: <strong>${race.basePrice}</strong> 
						• ${ageRange}
						${genders ? ` • Genders: ${genders}` : ''}
						${race.allowCustomXenotypes ? ' • Custom xenotypes allowed' : ''}
						${race.xenotypes.length ? ` (${race.xenotypes.length} xenotypes)` : ''}
					</summary>
					<div class="xenotype-list">
			`;

			if (race.xenotypes.length === 0) {
				html += `<div style="padding:12px;color:#888;">No xenotypes available for this race.</div>`;
			} else {
				race.xenotypes.forEach(xeno => {
					html += `
						<div class="xenotype-item">
							<div>
								<strong>${this.escapeHtml(xeno.name)}</strong>
								<span style="color:#888; font-size:0.9em;"> (${xeno.defName})</span>
							</div>
							<div style="color:#4ade80; font-weight:bold;">${xeno.basePrice}</div>
						</div>
					`;
				});
			}

			html += `</div></details>`;
		});

		container.innerHTML = html;
	}

    renderCommands() {
        const container = document.getElementById('commands-container');
        const commands = this.filteredData.commands;

        if (!container) return;
        if (commands.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;">No commands found</div>';
            return;
        }

        let html = '';
        commands.forEach(cmd => {
            const statusClass = cmd.enabled ? 'status-enabled' : 'status-disabled';
            const statusLabel = cmd.enabled ? 'Enabled' : 'Disabled';
            const aliasText = cmd.commandAlias
                ? ` • Alias: <code>!${this.escapeHtml(cmd.commandAlias)}</code>`
                : '';
            const costText = cmd.supportsCost || cmd.cost > 0
                ? ` • Cost: <strong>${cmd.cost}</strong>`
                : '';
            const cooldownText = cmd.cooldownSeconds > 0 || cmd.useCommandCooldown
                ? ` • CD: <strong>${cmd.cooldownSeconds}s</strong>`
                : '';
            const customCount = (cmd.customSettings || []).length;
            const customHint = customCount
                ? ` • <span class="command-custom-hint">${customCount} option${customCount === 1 ? '' : 's'}</span>`
                : '';

            const labelText = cmd.label
                ? ` <span class="command-label">(${this.escapeHtml(cmd.label)})</span>`
                : '';
            const summaryDesc = cmd.description
                ? `<div class="command-summary-desc">${this.escapeHtml(cmd.description)}</div>`
                : '';

            html += `
                <details class="race-group command-group ${statusClass}">
                    <summary>
                        <span class="status-badge ${statusClass}">${statusLabel}</span>
                        <strong>!${this.escapeHtml(cmd.name)}</strong>${labelText}
                        <span class="command-perm">${this.escapeHtml(cmd.permissionLevel)}</span>
                        ${aliasText}${costText}${cooldownText}${customHint}
                        ${summaryDesc}
                    </summary>
                    <div class="command-settings-list">
                        ${this.renderCommandSettings(cmd)}
                    </div>
                </details>
            `;
        });

        container.innerHTML = html;
    }

    renderCommandSettings(cmd) {
        const rows = [];
        const add = (label, value) => {
            if (value === undefined || value === null || value === '') return;
            let display;
            if (Array.isArray(value)) {
                if (value.length === 0) return;
                display = value.map(v => `<span class="setting-chip">${this.escapeHtml(String(v))}</span>`).join(' ');
            } else if (typeof value === 'boolean') {
                display = value
                    ? '<span class="status-badge status-enabled">Yes</span>'
                    : '<span class="status-badge status-disabled">No</span>';
            } else {
                display = `<strong>${this.escapeHtml(String(value))}</strong>`;
            }
            rows.push(`
                <div class="command-setting-row">
                    <div class="command-setting-label">${this.escapeHtml(label)}</div>
                    <div class="command-setting-value">${display}</div>
                </div>
            `);
        };

        const addSection = (title) => {
            rows.push(`
                <div class="command-settings-section">
                    <div class="command-settings-section-title">${this.escapeHtml(title)}</div>
                </div>
            `);
        };

        // Core settings (always shown)
        addSection('General');
        if (cmd.label) add('Label', cmd.label);
        if (cmd.description) {
            rows.push(`
                <div class="command-setting-row command-description-row">
                    <div class="command-setting-label">Description</div>
                    <div class="command-setting-value command-description-text">${this.escapeHtml(cmd.description)}</div>
                </div>
            `);
        }
        add('Enabled', cmd.enabled);
        add('Permission', cmd.permissionLevel);
        add('Command alias', cmd.commandAlias || '(none)');
        add('Cost', cmd.cost);
        add('Supports cost', cmd.supportsCost);
        add('Cooldown (seconds)', cmd.cooldownSeconds);
        add('Uses command cooldown', cmd.useCommandCooldown);
        add('Max uses per cooldown', cmd.maxUsesPerCooldownPeriod);
        add('Requires confirmation', cmd.requiresConfirmation);

        // Raid lists (still top-level fields in CommandSettings)
        if ((cmd.allowedRaidTypes && cmd.allowedRaidTypes.length) ||
            (cmd.allowedRaidStrategies && cmd.allowedRaidStrategies.length)) {
            addSection('Raid options');
            add('Allowed raid types', cmd.allowedRaidTypes);
            add('Allowed raid strategies', cmd.allowedRaidStrategies);
        }

        // CustomData JSON — primary home for command-specific options in modern RICS
        const customKeys = new Set((cmd.customSettings || []).map(s => s.key));
        if (cmd.customSettings && cmd.customSettings.length) {
            addSection('Command-specific settings');
            cmd.customSettings.forEach(entry => {
                rows.push(this.renderCustomDataRow(entry));
            });
        }

        // Legacy top-level wager/loot fields only if not already covered by CustomData
        const isLootCmd = cmd.name === 'openlootbox' || cmd.name === 'cleanlootboxes';
        const hasLegacyRaid =
            !customKeys.has('defaultRaidWager') && !customKeys.has('minRaidWager') && !customKeys.has('maxRaidWager') &&
            (cmd.defaultRaidWager !== undefined || cmd.minRaidWager !== undefined || cmd.maxRaidWager !== undefined) &&
            (cmd.name === 'raid' || (cmd.allowedRaidTypes && cmd.allowedRaidTypes.length > 0));
        const hasLegacyMil =
            !customKeys.has('defaultMilitaryAidWager') &&
            cmd.name === 'militaryaid' &&
            (cmd.defaultMilitaryAidWager !== undefined || cmd.minMilitaryAidWager !== undefined || cmd.maxMilitaryAidWager !== undefined);

        if (hasLegacyRaid) {
            addSection('Raid wagers (legacy)');
            add('Raid wager (default / min / max)',
                `${cmd.defaultRaidWager ?? '—'} / ${cmd.minRaidWager ?? '—'} / ${cmd.maxRaidWager ?? '—'}`);
        }
        if (hasLegacyMil) {
            addSection('Military aid wagers (legacy)');
            add('Military aid wager (default / min / max)',
                `${cmd.defaultMilitaryAidWager ?? '—'} / ${cmd.minMilitaryAidWager ?? '—'} / ${cmd.maxMilitaryAidWager ?? '—'}`);
        }
        if (isLootCmd && (cmd.defaultLootBoxSize !== undefined || cmd.minLootBoxSize !== undefined || cmd.maxLootBoxSize !== undefined)) {
            addSection('Loot box');
            add('Loot box size (default / min / max)',
                `${cmd.defaultLootBoxSize ?? '—'} / ${cmd.minLootBoxSize ?? '—'} / ${cmd.maxLootBoxSize ?? '—'}`);
        }

        return rows.join('') || '<div style="padding:12px;color:#888;">No sub-settings.</div>';
    }

    renderCustomDataRow(entry) {
        let display;
        if (entry.kind === 'bool') {
            const on = String(entry.value).toLowerCase() === 'true';
            display = on
                ? '<span class="status-badge status-enabled">Yes</span>'
                : '<span class="status-badge status-disabled">No</span>';
        } else if (entry.kind === 'number') {
            // Preserve decimals from JSON strings (e.g. "1.0")
            display = `<strong class="custom-number">${this.escapeHtml(entry.value)}</strong>`;
        } else {
            display = `<strong>${this.escapeHtml(entry.value)}</strong>`;
        }

        return `
            <div class="command-setting-row custom-data-row" data-key="${this.escapeHtml(entry.key)}">
                <div class="command-setting-label">
                    ${this.escapeHtml(entry.label)}
                    <span class="custom-data-key">${this.escapeHtml(entry.key)}</span>
                </div>
                <div class="command-setting-value">${display}</div>
            </div>
        `;
    }

    renderWeather() { /* unchanged */ 
        const tbody = document.getElementById('weather-tbody');
        const weather = this.filteredData.weather;
        if (weather.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;">No weather found</td></tr>'; return; }
        tbody.innerHTML = weather.map(w => {
            const colored = this.convertRimWorldColors(w.label);
            return `<tr>
                <td><div class="item-name">${colored}</div><span class="metadata">${this.escapeHtml(w.defName)}<br>From ${this.escapeHtml(w.modSource)}<br>Usage: !weather ${this.escapeHtml(w.label)} or !weather ${this.escapeHtml(w.defName)}</span></td>
                <td class="no-wrap"><strong>${w.baseCost}</strong></td>
                <td>${this.escapeHtml(w.karmaType)}</td>
                <td>${w.description ? `<div class="trait-description">${this.convertRimWorldColors(w.description)}</div>` : 'No description'}</td>
            </tr>`;
        }).join('');
    }

    renderMods() {
        const tbody = document.getElementById('mods-tbody');
        const mods = this.filteredData.mods;
        if (mods.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;">No mods exported yet (or ActiveMods.json missing)</td></tr>';
            return;
        }

        tbody.innerHTML = mods.map(mod => {
            let steamLink = '—';
            if (mod.steamId) {
                steamLink = `<a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.steamId}" 
                               target="_blank" rel="noopener" class="steam-link">
                               Open on Steam Workshop
                             </a>`;
            }
            return `
                <tr>
                    <td><div class="item-name">${this.escapeHtml(mod.name)}</div></td>
                    <td>${this.escapeHtml(mod.author)}</td>
                    <td class="no-wrap">${this.escapeHtml(mod.version)}</td>
                    <td>${steamLink}</td>
                </tr>
            `;
        }).join('');
    }
    // ==================== HELPERS ====================
    getUsageTypes(item) {
        const types = [];
        if (item.isUsable) types.push('Usable');
        if (item.isEquippable) types.push('Equippable');
        if (item.isWearable) types.push('Wearable');
        return types.length ? `<br><span class="usage">Usage: ${types.join(', ')}</span>` : '';
    }

    getAvailableGenders(g) {
        const arr = [];
        if (g.AllowMale) arr.push('M');
        if (g.AllowFemale) arr.push('F');
        if (g.AllowOther) arr.push('O');
        return arr.join(' ');
    }

    getModDisplayName(mod) {
        return mod === 'Core' ? 'RimWorld' : (mod || 'Unknown');
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe || '';
        return this.convertRimWorldColors(unsafe);   // colors now work
    }

    // ==================== FULL EVENT SYSTEM (this was missing) ====================
    setupEventListeners() {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        ['items','events','weather','traits','races','commands','mods'].forEach(tab => this.setupSearch(tab));
        this.setupSorting();
    }

    setupSearch(tabName) {
        const input = document.getElementById(`${tabName}-search`);
        if (input) {
            input.addEventListener('input', e => this.filterTab(tabName, e.target.value));
        }
    }

    filterTab(tabName, searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const all = this.data[tabName] || [];
        if (!term) {
            this.filteredData[tabName] = [...all];
        } else if (tabName === 'commands') {
            this.filteredData.commands = all.filter(cmd => {
                const status = cmd.enabled ? 'enabled' : 'disabled';
                const customText = (cmd.customSettings || [])
                    .map(s => `${s.key} ${s.label} ${s.value}`)
                    .join(' ');
                const text = [
                    cmd.name, cmd.defName, cmd.label, cmd.description,
                    cmd.commandAlias, cmd.permissionLevel,
                    status, String(cmd.cost), String(cmd.cooldownSeconds),
                    ...(cmd.allowedRaidTypes || []),
                    ...(cmd.allowedRaidStrategies || []),
                    cmd.customDataRaw || '',
                    customText
                ].join(' ').toLowerCase();
                return text.includes(term);
            });
        } else if (tabName === 'races') {
            this.filteredData.races = all.filter(race => {
                const xenoNames = (race.xenotypes || []).map(x => x.name).join(' ');
                const text = [
                    race.name, race.defName, race.defaultXenotype, xenoNames
                ].join(' ').toLowerCase();
                return text.includes(term);
            });
        } else {
            this.filteredData[tabName] = all.filter(item => {
				const text = [
                    item.name, item.label, item.defName, item.description,
                    item.category, item.karmaType, item.modSource,
                    ...(Array.isArray(item.stats) ? item.stats : []),
                    ...(Array.isArray(item.conflicts) ? item.conflicts : []),
                    // mods tab support
                    item.author || ''
                ].join(' ').toLowerCase();
                return text.includes(term);
            });
        }
        this[`render${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`]();
    }

    setupSorting() {
        document.querySelectorAll('th[data-sort]').forEach(header => {
            header.addEventListener('click', () => {
                const tab = header.closest('.tab-pane').id;
                this.sortTab(tab, header.dataset.sort);
            });
        });
    }

    sortTab(tabName, field) {
        if (!this.currentSort[tabName]) this.currentSort[tabName] = { field, direction: 'asc' };
        else if (this.currentSort[tabName].field === field) this.currentSort[tabName].direction = this.currentSort[tabName].direction === 'asc' ? 'desc' : 'asc';
        else this.currentSort[tabName] = { field, direction: 'asc' };

        this.filteredData[tabName].sort((a, b) => {
            let va = a[field], vb = b[field];
            if (field === 'quantityLimit') { va = va === 'Unlimited' ? Infinity : va; vb = vb === 'Unlimited' ? Infinity : vb; }
            if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
            if (va < vb) return this.currentSort[tabName].direction === 'asc' ? -1 : 1;
            if (va > vb) return this.currentSort[tabName].direction === 'asc' ? 1 : -1;
            return 0;
        });

        this[`render${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`]();
    }

    switchTab(tabName) {
        console.log('Switching to tab:', tabName); // remove after testing if you want
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        const pane = document.getElementById(tabName);
        if (pane) pane.classList.add('active');
    }

    // ==================== SAMPLE (fallback) ====================
    loadSampleData() {
        // ... (your sample items + one entry per tab - kept short)
        this.data.items = [{defName:"TextBook",name:"Textbook",price:267,category:"Books",quantityLimit:5,mod:"Core",isUsable:false,isEquippable:false,isWearable:false,enabled:true}];
        this.filteredData.items = [...this.data.items];
        // add one dummy for each other tab...
        this.renderAllTabs();
    }
}

document.addEventListener('DOMContentLoaded', () => new RICSStore());
