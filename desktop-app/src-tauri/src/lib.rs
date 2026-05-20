#[tauri::command]
fn export_hwpx_from_html(html: String) -> Result<Vec<u8>, String> {
    match convert_html_to_hwpx(&html) {
        Ok(bytes) => Ok(bytes),
        Err(primary_error) => {
            let safe_html = simplify_html_for_rhwp(&html);
            convert_html_to_hwpx(&safe_html).map_err(|safe_error| {
                format!(
                    "HWPX 네이티브 변환 실패: {primary_error} / 안전 표 변환도 실패: {safe_error}"
                )
            })
        }
    }
}

fn convert_html_to_hwpx(html: &str) -> Result<Vec<u8>, String> {
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let mut core = rhwp::DocumentCore::new_empty();
        core.create_blank_document_native()
            .map_err(|error| format!("빈 HWP 문서 생성 실패: {error}"))?;

        let section_idx = 0usize;
        let para_idx = 0usize;
        let char_offset = 0usize;
        core.paste_html_native(section_idx, para_idx, char_offset, &html)
            .map_err(|error| format!("HTML 표 변환 실패: {error}"))?;

        core.export_hwpx_native()
            .map_err(|error| format!("HWPX 내보내기 실패: {error}"))
    }))
    .map_err(panic_message)?
}

fn panic_message(payload: Box<dyn std::any::Any + Send>) -> String {
    if let Some(message) = payload.downcast_ref::<&str>() {
        format!("HWPX 네이티브 변환 중 내부 오류가 발생했습니다: {message}")
    } else if let Some(message) = payload.downcast_ref::<String>() {
        format!("HWPX 네이티브 변환 중 내부 오류가 발생했습니다: {message}")
    } else {
        "HWPX 네이티브 변환 중 내부 오류가 발생했습니다.".to_string()
    }
}

fn simplify_html_for_rhwp(html: &str) -> String {
    let fragment = extract_fragment(html);
    let mut output = String::new();
    let mut pos = 0usize;
    let lower = fragment.to_lowercase();

    while let Some(start_rel) = lower[pos..].find("<table") {
        let start = pos + start_rel;
        let Some(end) = find_closing_tag(fragment, start, "table") else {
            break;
        };
        output.push_str(&simplify_table_for_rhwp(&fragment[start..end]));
        pos = end;
    }

    if output.trim().is_empty() {
        let text = html_to_text(fragment);
        output.push_str("<p>");
        output.push_str(&escape_html(&text));
        output.push_str("</p>");
    }

    format!("<html><body><!--StartFragment-->{output}<!--EndFragment--></body></html>")
}

fn extract_fragment(html: &str) -> &str {
    if let Some(start) = html.find("<!--StartFragment-->") {
        let after = &html[start + "<!--StartFragment-->".len()..];
        if let Some(end) = after.find("<!--EndFragment-->") {
            return &after[..end];
        }
        return after;
    }
    let lower = html.to_lowercase();
    if let Some(body_start) = lower.find("<body") {
        if let Some(open_end) = html[body_start..].find('>') {
            let inner_start = body_start + open_end + 1;
            if let Some(body_end_rel) = lower[inner_start..].find("</body>") {
                return &html[inner_start..inner_start + body_end_rel];
            }
            return &html[inner_start..];
        }
    }
    html
}

fn simplify_table_for_rhwp(table_html: &str) -> String {
    let mut rows = String::new();
    let lower = table_html.to_lowercase();
    let mut pos = 0usize;

    while let Some(tr_rel) = lower[pos..].find("<tr") {
        let tr_start = pos + tr_rel;
        let Some(tr_end) = find_closing_tag(table_html, tr_start, "tr") else {
            break;
        };
        let tr_html = &table_html[tr_start..tr_end];
        let tr_lower = tr_html.to_lowercase();
        let mut cells = String::new();
        let mut cell_pos = 0usize;

        loop {
            let td = tr_lower[cell_pos..].find("<td");
            let th = tr_lower[cell_pos..].find("<th");
            let (cell_rel, tag_name) = match (td, th) {
                (Some(td_pos), Some(th_pos)) if td_pos <= th_pos => (td_pos, "td"),
                (Some(td_pos), None) => (td_pos, "td"),
                (Some(_), Some(th_pos)) => (th_pos, "th"),
                (None, Some(th_pos)) => (th_pos, "th"),
                (None, None) => break,
            };

            let cell_start = cell_pos + cell_rel;
            let Some(open_end_rel) = tr_html[cell_start..].find('>') else {
                break;
            };
            let open_end = cell_start + open_end_rel + 1;
            let close_tag = format!("</{tag_name}>");
            let Some(close_rel) = tr_lower[open_end..].find(&close_tag) else {
                break;
            };
            let close_start = open_end + close_rel;
            let open_tag = &tr_html[cell_start..open_end];
            let content = &tr_html[open_end..close_start];
            cells.push_str(&simplify_cell_for_rhwp(tag_name, open_tag, content));
            cell_pos = close_start + close_tag.len();
        }

        if !cells.is_empty() {
            rows.push_str("<tr>");
            rows.push_str(&cells);
            rows.push_str("</tr>");
        }
        pos = tr_end;
    }

    if rows.is_empty() {
        return String::new();
    }

    format!(
        "<table style=\"border-collapse:collapse;table-layout:fixed;width:425.2pt;\">{rows}</table>"
    )
}

fn simplify_cell_for_rhwp(tag_name: &str, open_tag: &str, content: &str) -> String {
    let original_lower = open_tag.to_lowercase();
    let mut attrs = String::new();
    if let Some(value) = extract_attr(open_tag, "colspan") {
        attrs.push_str(&format!(" colspan=\"{}\"", escape_html(&value)));
    }
    if let Some(value) = extract_attr(open_tag, "rowspan") {
        attrs.push_str(&format!(" rowspan=\"{}\"", escape_html(&value)));
    }

    let is_gray = original_lower.contains("gray")
        || original_lower.contains("background:#d9d9d9")
        || original_lower.contains("background: rgb(217, 217, 217)")
        || original_lower.contains("background-color: rgb(217, 217, 217)");
    let align = if original_lower.contains("left") { "left" } else { "center" };
    let background = if is_gray { "#d9d9d9" } else { "#ffffff" };
    let tag = if tag_name == "th" { "th" } else { "td" };
    let text = html_to_text(content);
    let body = if text.trim().is_empty() {
        "&nbsp;".to_string()
    } else {
        escape_html(&text)
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty())
            .collect::<Vec<_>>()
            .join("<br>")
    };

    format!(
        "<{tag}{attrs} style=\"border:0.5pt solid #9ca3af;padding:2pt 3pt;background-color:{background};text-align:{align};vertical-align:middle;font-size:9pt;line-height:1.2;\">{body}</{tag}>"
    )
}

fn find_closing_tag(html: &str, start: usize, tag: &str) -> Option<usize> {
    let lower = html.to_lowercase();
    let open_pattern = format!("<{tag}");
    let close_pattern = format!("</{tag}>");
    let mut depth = 0usize;
    let mut pos = start;

    while pos < lower.len() {
        let next_open = lower[pos..].find(&open_pattern).map(|idx| pos + idx);
        let next_close = lower[pos..].find(&close_pattern).map(|idx| pos + idx);
        match (next_open, next_close) {
            (Some(open), Some(close)) if open < close => {
                depth += 1;
                pos = open + open_pattern.len();
            }
            (_, Some(close)) => {
                if depth == 0 {
                    return None;
                }
                depth -= 1;
                pos = close + close_pattern.len();
                if depth == 0 {
                    return Some(pos);
                }
            }
            _ => return None,
        }
    }
    None
}

fn extract_attr(tag: &str, name: &str) -> Option<String> {
    let lower = tag.to_lowercase();
    let start = lower.find(name)?;
    let after_name = &tag[start + name.len()..];
    let eq = after_name.find('=')?;
    let value = after_name[eq + 1..].trim_start();
    if value.starts_with('"') {
        let rest = &value[1..];
        let end = rest.find('"')?;
        Some(rest[..end].to_string())
    } else if value.starts_with('\'') {
        let rest = &value[1..];
        let end = rest.find('\'')?;
        Some(rest[..end].to_string())
    } else {
        let end = value
            .find(|c: char| c.is_whitespace() || c == '>')
            .unwrap_or(value.len());
        Some(value[..end].to_string())
    }
}

fn html_to_text(html: &str) -> String {
    let mut output = String::new();
    let mut inside_tag = false;
    let mut tag_buf = String::new();

    for ch in html.chars() {
        if inside_tag {
            tag_buf.push(ch);
            if ch == '>' {
                let lower = tag_buf.to_lowercase();
                if lower.starts_with("<br")
                    || lower.starts_with("</p")
                    || lower.starts_with("</div")
                    || lower.starts_with("</li")
                {
                    output.push('\n');
                }
                tag_buf.clear();
                inside_tag = false;
            }
            continue;
        }
        if ch == '<' {
            inside_tag = true;
            tag_buf.push(ch);
        } else {
            output.push(ch);
        }
    }

    decode_html_entities(&output)
        .lines()
        .map(|line| line.split_whitespace().collect::<Vec<_>>().join(" "))
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

fn decode_html_entities(value: &str) -> String {
    value
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![export_hwpx_from_html])
        .run(tauri::generate_context!())
        .expect("error while running seochang operations desktop");
}
